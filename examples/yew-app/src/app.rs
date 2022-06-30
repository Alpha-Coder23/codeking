use url::Url;
use yew::prelude::*;
use yew_router::history::{AnyHistory, History, MemoryHistory};
use yew_router::prelude::*;

use crate::routes::index::Index;
use crate::routes::todos::Todos; 
use crate::components::header::Header; 
use crate::shared::Route;

#[function_component]
pub fn NotFound() -> Html {
  html! {
    <div class="screen e404">
      <h2>
        {"Ooooooops, nothing here!"}
      </h2>
      <p>
        <Link<Route> to={Route::Home}>{"Go back to the homepage"}</Link<Route>>
      </p>
    </div>
  }
}

fn switch(routes: Route) -> Html {
  match routes {
    Route::Home => html! { <Index /> },
    Route::Todos => html! { <Todos /> },
    Route::NotFound => html! { <NotFound/> },
  }
}

#[derive(Properties, PartialEq, Default)]
pub struct AppProps {
  pub ssr_url: Option<String>,
}

#[function_component]
pub fn App(props: &AppProps) -> Html {
  if let Some(url) = &props.ssr_url {
    let history = AnyHistory::from(MemoryHistory::new());
    let url = Url::parse(url).unwrap();
    history.push(url.path());
    html! {
      <Router history={history}>
        <Header/>
        <Switch<Route> render={switch} />
     </Router>
    }
  } else {
    html! {
      <BrowserRouter>
        <Header/>
        <Switch<Route> render={switch} />
      </BrowserRouter>
    }
  }
}
