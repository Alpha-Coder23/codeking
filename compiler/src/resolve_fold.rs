use crate::resolve::{DependencyDescriptor, Resolver};

use sha1::{Digest, Sha1};
use std::{cell::RefCell, rc::Rc};
use swc_common::{SourceMap, Span, DUMMY_SP};
use swc_ecma_ast::*;
use swc_ecma_utils::quote_ident;
use swc_ecma_visit::{noop_fold_type, Fold, FoldWith};

pub fn aleph_resolve_fold(resolver: Rc<RefCell<Resolver>>, source: Rc<SourceMap>) -> impl Fold {
  AlephResolveFold {
    deno_hooks_idx: 0,
    resolver,
    source,
  }
}

pub struct AlephResolveFold {
  deno_hooks_idx: i32,
  resolver: Rc<RefCell<Resolver>>,
  source: Rc<SourceMap>,
}

impl AlephResolveFold {
  fn new_use_deno_hook_ident(&mut self, callback_span: &Span) -> String {
    let resolver = self.resolver.borrow_mut();
    self.deno_hooks_idx = self.deno_hooks_idx + 1;
    let mut ident: String = "useDeno-".to_owned();
    let mut hasher = Sha1::new();
    let callback_code = self.source.span_to_snippet(callback_span.clone()).unwrap();
    hasher.update(resolver.specifier.clone());
    hasher.update(self.deno_hooks_idx.to_string());
    hasher.update(callback_code.clone());
    ident.push_str(
      base64::encode(hasher.finalize())
        .replace("+", "")
        .replace("/", "")
        .replace("=", "")
        .as_str(),
    );
    ident
  }
}

impl Fold for AlephResolveFold {
  noop_fold_type!();

  // resolve import/export url
  // [/pages/index.tsx]
  // - es6 mode:
  //   - `import React, { useState } from "https://esm.sh/react"` -> `import React, {useState} from "/-/esm.sh/react.js"`
  //   - `import * as React from "https://esm.sh/react"` -> `import * as React from "/-/esm.sh/react.js"`
  //   - `import Logo from "../components/logo.tsx"` -> `import Logo from "/components/logo.js"`
  //   - `import "../style/index.css" -> `import "/style/index.css.js"`
  //   - `export React, {useState} from "https://esm.sh/react"` -> `export React, {useState} from * from "/-/esm.sh/react.js"`
  //   - `export * from "https://esm.sh/react"` -> `export * from "/-/esm.sh/react.js"`
  // - bundling mode:
  //   - `import React, { useState } from "https://esm.sh/react"` -> `const { default: React, useState } = __ALEPH.pack["https://esm.sh/react"];`
  //   - `import * as React from "https://esm.sh/react"` -> `const React = __ALEPH.pack["https://esm.sh/react"]`
  //   - `import Logo from "../components/logo.tsx"` -> `const { default: Logo } = __ALEPH.pack["/components/logo.tsx"]`
  //   - `export React, {useState} from "https://esm.sh/react"` -> `export const { default: React, useState } = __ALEPH.pack["https://esm.sh/react"]`
  //   - `export * from "https://esm.sh/react"` -> `export const $$star_N = __ALEPH.pack["https://esm.sh/react"]`
  fn fold_module_items(&mut self, module_items: Vec<ModuleItem>) -> Vec<ModuleItem> {
    let mut items = Vec::<ModuleItem>::new();

    for item in module_items {
      match item {
        ModuleItem::ModuleDecl(decl) => {
          let item: ModuleItem = match decl {
            // match: import React, { useState } from "https://esm.sh/react"
            ModuleDecl::Import(import_decl) => {
              if import_decl.type_only {
                // ingore type import
                ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl))
              } else {
                let mut resolver = self.resolver.borrow_mut();
                let (resolved_path, fixed_url) =
                  resolver.resolve(import_decl.src.value.as_ref(), false);
                if resolver.bundle_mode && resolver.bundle_external.contains(fixed_url.as_str()) {
                  let mut names: Vec<(Ident, Option<String>)> = vec![];
                  let mut ns: Option<Ident> = None;
                  import_decl
                    .specifiers
                    .into_iter()
                    .for_each(|specifier| match specifier {
                      ImportSpecifier::Named(ImportNamedSpecifier {
                        local, imported, ..
                      }) => {
                        names.push((
                          local,
                          match imported {
                            Some(name) => Some(name.sym.as_ref().into()),
                            None => None,
                          },
                        ));
                      }
                      ImportSpecifier::Default(ImportDefaultSpecifier { local, .. }) => {
                        names.push((local, Some("default".into())));
                      }
                      ImportSpecifier::Namespace(ImportStarAsSpecifier { local, .. }) => {
                        ns = Some(local);
                      }
                    });
                  if let Some(name) = ns {
                    ModuleItem::Stmt(Stmt::Decl(Decl::Var(VarDecl {
                      span: DUMMY_SP,
                      kind: VarDeclKind::Const,
                      declare: false,
                      decls: vec![create_aleph_pack_var_decl(fixed_url.as_ref(), name)],
                    })))
                  } else if names.len() > 0 {
                    // const {default: React, useState} = __ALEPH.pack["https://esm.sh/react"];
                    ModuleItem::Stmt(Stmt::Decl(Decl::Var(VarDecl {
                      span: DUMMY_SP,
                      kind: VarDeclKind::Const,
                      declare: false,
                      decls: vec![create_aleph_pack_var_decl_member(fixed_url.as_ref(), names)],
                    })))
                  } else {
                    ModuleItem::Stmt(Stmt::Empty(EmptyStmt { span: DUMMY_SP }))
                  }
                } else {
                  ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
                    src: new_str(resolved_path),
                    ..import_decl
                  }))
                }
              }
            }
            // match: export { default as React, useState } from "https://esm.sh/react"
            // match: export * as React from "https://esm.sh/react"
            ModuleDecl::ExportNamed(NamedExport {
              type_only,
              specifiers,
              src: Some(src),
              ..
            }) => {
              if type_only {
                // ingore type export
                ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(NamedExport {
                  span: DUMMY_SP,
                  specifiers,
                  src: Some(src),
                  type_only: true,
                  asserts: None,
                }))
              } else {
                let mut resolver = self.resolver.borrow_mut();
                let (resolved_path, fixed_url) = resolver.resolve(src.value.as_ref(), false);
                if resolver.bundle_mode && resolver.bundle_external.contains(fixed_url.as_str()) {
                  let mut names: Vec<(Ident, Option<String>)> = vec![];
                  let mut ns: Option<Ident> = None;
                  specifiers
                    .into_iter()
                    .for_each(|specifier| match specifier {
                      ExportSpecifier::Named(ExportNamedSpecifier { orig, exported, .. }) => {
                        names.push((
                          orig,
                          match exported {
                            Some(name) => Some(name.sym.as_ref().into()),
                            None => None,
                          },
                        ));
                      }
                      ExportSpecifier::Default(ExportDefaultSpecifier { exported, .. }) => {
                        names.push((exported, Some("default".into())));
                      }
                      ExportSpecifier::Namespace(ExportNamespaceSpecifier { name, .. }) => {
                        ns = Some(name);
                      }
                    });
                  if let Some(name) = ns {
                    ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                      span: DUMMY_SP,
                      decl: Decl::Var(VarDecl {
                        span: DUMMY_SP,
                        kind: VarDeclKind::Const,
                        declare: false,
                        decls: vec![create_aleph_pack_var_decl(fixed_url.as_ref(), name)],
                      }),
                    }))
                  } else if names.len() > 0 {
                    ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                      span: DUMMY_SP,
                      decl: Decl::Var(VarDecl {
                        span: DUMMY_SP,
                        kind: VarDeclKind::Const,
                        declare: false,
                        decls: vec![create_aleph_pack_var_decl_member(fixed_url.as_ref(), names)],
                      }),
                    }))
                  } else {
                    ModuleItem::Stmt(Stmt::Empty(EmptyStmt { span: DUMMY_SP }))
                  }
                } else {
                  ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(NamedExport {
                    span: DUMMY_SP,
                    specifiers,
                    src: Some(new_str(resolved_path)),
                    type_only: false,
                    asserts: None,
                  }))
                }
              }
            }
            // match: export * from "https://esm.sh/react"
            ModuleDecl::ExportAll(ExportAll { src, .. }) => {
              let mut resolver = self.resolver.borrow_mut();
              let (resolved_path, fixed_url) = resolver.resolve(src.value.as_ref(), false);
              if resolver.bundle_mode && resolver.bundle_external.contains(fixed_url.as_str()) {
                resolver.star_exports.push(fixed_url.clone());
                ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                  span: DUMMY_SP,
                  decl: Decl::Var(VarDecl {
                    span: DUMMY_SP,
                    kind: VarDeclKind::Const,
                    declare: false,
                    decls: vec![create_aleph_pack_var_decl(
                      fixed_url.as_ref(),
                      quote_ident!(format!("$$star_{}", resolver.star_exports.len() - 1)),
                    )],
                  }),
                }))
              } else {
                ModuleItem::ModuleDecl(ModuleDecl::ExportAll(ExportAll {
                  span: DUMMY_SP,
                  src: new_str(resolved_path.into()),
                  asserts: None,
                }))
              }
            }
            _ => ModuleItem::ModuleDecl(decl),
          };
          items.push(item.fold_children_with(self));
        }
        _ => {
          items.push(item.fold_children_with(self));
        }
      };
    }

    items
  }

  fn fold_expr(&mut self, expr: Expr) -> Expr {
    let specifier = self.resolver.borrow().specifier.clone();
    let expr = match expr {
      Expr::Member(MemberExpr {
        span,
        obj,
        prop,
        computed,
      }) => {
        let mut is_import_meta_url = false;
        if let Expr::Ident(id) = prop.as_ref() {
          if id.sym.as_ref().eq("url") {
            if let ExprOrSuper::Expr(ref expr) = obj {
              if let Expr::MetaProp(MetaPropExpr { meta, prop }) = expr.as_ref() {
                if meta.sym.as_ref().eq("import") && prop.sym.as_ref().eq("meta") {
                  is_import_meta_url = true
                }
              }
            }
          }
        }
        if is_import_meta_url {
          Expr::Lit(Lit::Str(new_str(specifier)))
        } else {
          Expr::Member(MemberExpr {
            span,
            obj,
            prop,
            computed,
          })
        }
      }
      _ => expr,
    };

    expr.fold_children_with(self)
  }

  // resolve dynamic import url & sign useDeno hook
  // - `import("https://esm.sh/rect")` -> `import("/-/esm.sh/react.js")`
  // - `import("../components/logo.tsx")` -> `import("../components/logo.js#/components/logo.tsx@000000")`
  // - `import("../components/logo.tsx")` -> `__ALEPH.import("../components/logo.js#/components/logo.tsx@000000", "/pages/index.tsx")`
  // - `useDeno(() => {})` -> `useDeno(() => {}, false, "useDeno.KEY")`
  fn fold_call_expr(&mut self, mut call: CallExpr) -> CallExpr {
    if is_call_expr_by_name(&call, "import") {
      let url = match call.args.first() {
        Some(ExprOrSpread { expr, .. }) => match expr.as_ref() {
          Expr::Lit(lit) => match lit {
            Lit::Str(s) => s.value.as_ref(),
            _ => return call,
          },
          _ => return call,
        },
        _ => return call,
      };
      let mut resolver = self.resolver.borrow_mut();
      if resolver.bundle_mode {
        call.callee = ExprOrSuper::Expr(Box::new(Expr::MetaProp(MetaPropExpr {
          meta: quote_ident!("__ALEPH"),
          prop: quote_ident!("import"),
        })))
      }
      call.args = vec![ExprOrSpread {
        spread: None,
        expr: Box::new(Expr::Lit(Lit::Str(new_str(resolver.resolve(url, true).0)))),
      }];
      if resolver.bundle_mode {
        call.args.push(ExprOrSpread {
          spread: None,
          expr: Box::new(Expr::Lit(Lit::Str(new_str(resolver.specifier.clone())))),
        })
      }
    } else if is_call_expr_by_name(&call, "useDeno") {
      let callback_span = match call.args.first() {
        Some(ExprOrSpread { expr, .. }) => match expr.as_ref() {
          Expr::Fn(FnExpr {
            function: Function { span, .. },
            ..
          }) => Some(span),
          Expr::Arrow(ArrowExpr { span, .. }) => Some(span),
          _ => None,
        },
        _ => None,
      };
      if let Some(span) = callback_span {
        let bundle_mode = self.resolver.borrow().bundle_mode;
        let id = self.new_use_deno_hook_ident(span);
        if bundle_mode {
          call.args[0] = ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))),
          };
        }
        if call.args.len() == 1 {
          call.args.push(ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Lit(Lit::Num(Number {
              span: DUMMY_SP,
              value: 0 as f64,
            }))),
          });
        }
        if call.args.len() > 2 {
          call.args[2] = ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Lit(Lit::Str(new_str(id.clone())))),
          };
        } else {
          call.args.push(ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Lit(Lit::Str(new_str(id.clone())))),
          });
        }
        let mut resolver = self.resolver.borrow_mut();
        resolver.dep_graph.push(DependencyDescriptor {
          specifier: "#".to_owned() + id.clone().as_str(),
          is_dynamic: false,
        });
      }
    }

    call.fold_children_with(self)
  }
}

pub fn is_call_expr_by_name(call: &CallExpr, name: &str) -> bool {
  let callee = match &call.callee {
    ExprOrSuper::Super(_) => return false,
    ExprOrSuper::Expr(callee) => callee.as_ref(),
  };

  match callee {
    Expr::Ident(id) => id.sym.as_ref().eq(name),
    _ => false,
  }
}

fn create_aleph_pack_member_expr(url: &str) -> MemberExpr {
  MemberExpr {
    span: DUMMY_SP,
    obj: ExprOrSuper::Expr(Box::new(Expr::Ident(quote_ident!("__ALEPH")))),
    prop: Box::new(Expr::Member(MemberExpr {
      span: DUMMY_SP,
      obj: ExprOrSuper::Expr(Box::new(Expr::Ident(quote_ident!("pack")))),
      prop: Box::new(Expr::Lit(Lit::Str(Str {
        span: DUMMY_SP,
        value: url.into(),
        has_escape: false,
        kind: Default::default(),
      }))),
      computed: true,
    })),
    computed: false,
  }
}

fn create_aleph_pack_var_decl(url: &str, name: Ident) -> VarDeclarator {
  VarDeclarator {
    span: DUMMY_SP,
    name: Pat::Ident(name),
    init: Some(Box::new(Expr::Member(create_aleph_pack_member_expr(url)))),
    definite: false,
  }
}

pub fn create_aleph_pack_var_decl_member(
  url: &str,
  names: Vec<(Ident, Option<String>)>,
) -> VarDeclarator {
  VarDeclarator {
    span: DUMMY_SP,
    name: Pat::Object(ObjectPat {
      span: DUMMY_SP,
      props: names
        .into_iter()
        .map(|(name, rename)| {
          if let Some(rename) = rename {
            ObjectPatProp::KeyValue(KeyValuePatProp {
              key: PropName::Ident(quote_ident!(rename)),
              value: Box::new(Pat::Ident(name)),
            })
          } else {
            ObjectPatProp::Assign(AssignPatProp {
              span: DUMMY_SP,
              key: name,
              value: None,
            })
          }
        })
        .collect(),
      optional: false,
      type_ann: None,
    }),
    init: Some(Box::new(Expr::Member(create_aleph_pack_member_expr(url)))),
    definite: false,
  }
}

fn new_str(str: String) -> Str {
  Str {
    span: DUMMY_SP,
    value: str.into(),
    has_escape: false,
    kind: Default::default(),
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::import_map::ImportHashMap;
  use crate::resolve::Resolver;
  use crate::swc::{st, EmitOptions, ParsedModule};
  use sha1::{Digest, Sha1};

  #[test]
  fn sign_use_deno_hook() {
    let specifer = "/pages/index.tsx";
    let source = r#"
      export default function Index() {
        const verison = useDeno(() => Deno.version)
        const verison = useDeno(async function() {
          return await readJson("./data.json")
        }, 1000)
        return (
          <>
            <p>Deno v{version.deno}</p>
            <V8 />
            <TS />
          </>
        )
      }
    "#;

    let mut hasher = Sha1::new();
    hasher.update(specifer.clone());
    hasher.update("1");
    hasher.update("() => Deno.version");
    let id_1 = base64::encode(hasher.finalize())
      .replace("/", "")
      .replace("+", "");
    let id_1 = id_1.trim_end_matches('=');

    let mut hasher = Sha1::new();
    hasher.update(specifer.clone());
    hasher.update("2");
    hasher.update(
      r#"async function() {
          return await readJson("./data.json")
        }"#,
    );
    let id_2 = base64::encode(hasher.finalize())
      .replace("/", "")
      .replace("+", "");
    let id_2 = id_2.trim_end_matches('=');

    for _ in 0..3 {
      let (code, _) = st(specifer, source, false);
      assert!(code.contains(format!("0, \"useDeno-{}\"", id_1).as_str()));
      assert!(code.contains(format!("1000, \"useDeno-{}\"", id_2).as_str()));
      let (code, _) = st(specifer, source, true);
      assert!(code.contains(format!("null, 0, \"useDeno-{}\"", id_1).as_str()));
      assert!(code.contains(format!("null, 1000, \"useDeno-{}\"", id_2).as_str()));
    }
  }

  #[test]
  fn resolve_import_meta_url() {
    let source = r#"
      console.log(import.meta.url)
    "#;
    let (code, _) = st("/pages/index.tsx", source, true);
    assert!(code.contains("console.log(\"/pages/index.tsx\")"));
  }

  #[test]
  fn bundle_mode() {
    let source = r#"
      import React, { useState, useEffect as useEffect_ } from 'https://esm.sh/react'
      import * as React_ from 'https://esm.sh/react'
      import Logo from '../components/logo.tsx'
      import Nav from '../components/nav.tsx'
      import '../shared/iife.ts'
      import '../shared/iife2.ts'
      export * from "https://esm.sh/react"
      export { render } from "https://esm.sh/react-dom"
      export * as ReactDom from "https://esm.sh/react-dom"

      const AsyncLogo = React.lazy(() => import('../components/async-logo.tsx'))

      export default function Index() {
        return (
          <>
            <link rel="stylesheet" href="../style/index.css" />
            <head></head>
            <Logo />
            <AsyncLogo />
            <Nav />
            <h1>Hello World</h1>
          </>
        )
      }
    "#;
    let module =
      ParsedModule::parse("/pages/index.tsx", source, None).expect("could not parse module");
    let resolver = Rc::new(RefCell::new(Resolver::new(
      "/pages/index.tsx",
      ImportHashMap::default(),
      None,
      None,
      true,
      vec![
        "https://esm.sh/react".into(),
        "https://esm.sh/react-dom".into(),
        "/components/logo.tsx".into(),
        "/shared/iife.ts".into(),
      ],
    )));
    let (code, _) = module
      .transform(resolver.clone(), &EmitOptions::default())
      .expect("could not transform module");
    println!("{}", code);
    assert!(code.contains("const { default: React , useState , useEffect: useEffect_  } = __ALEPH.pack[\"https://esm.sh/react\"]"));
    assert!(code.contains("const React_ = __ALEPH.pack[\"https://esm.sh/react\"]"));
    assert!(code.contains("const { default: Logo  } = __ALEPH.pack[\"/components/logo.tsx\"]"));
    assert!(
      code.contains("import Nav from \"../components/nav.bundling.js#/components/nav.tsx@000000\"")
    );
    assert!(!code.contains("__ALEPH.pack[\"/shared/iife.ts\"]"));
    assert!(code.contains("import   \"../shared/iife2.bundling.js#/shared/iife2.ts@000000\""));
    assert!(code
      .contains("AsyncLogo = React.lazy(()=>__ALEPH.import(\"../components/async-logo.bundle.js#/components/async-logo.tsx@000000\", \"/pages/index.tsx\""));
    assert!(code.contains(
      "const { default: __ALEPH_Head  } = __ALEPH.pack[\"https://deno.land/x/aleph/framework/react/head.ts\"]"
    ));
    assert!(code.contains("export const $$star_0 = __ALEPH.pack[\"https://esm.sh/react\"]"));
    assert!(code.contains("export const ReactDom = __ALEPH.pack[\"https://esm.sh/react-dom\"]"));
    assert!(code.contains("export const { render  } = __ALEPH.pack[\"https://esm.sh/react-dom\"]"));
  }
}
