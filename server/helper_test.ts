import { assert, assertEquals, assertThrows } from 'std/testing/asserts.ts'
import {
  clearCompilation,
  computeHash,
  formatBytesWithColor,
  getAlephPkgUri,
  getFlag,
  getRelativePath,
  isLoaderPlugin,
  parsePortNumber,
  toLocalUrl,
} from './helper.ts'
import { LoaderPlugin } from '.././types.ts'
import { VERSION } from '../version.ts'

Deno.test(`server/helper: toLocalUrl`, async () => {
  // test toLocalUrl
  assertEquals(
    toLocalUrl('https://esm.sh/react@17.0.1'),
    '/-/esm.sh/react@17.0.1'
  )
  assertEquals(
    toLocalUrl('https://esm.sh:443/react@17.0.1'),
    '/-/esm.sh/react@17.0.1'
  )
  assertEquals(
    toLocalUrl('https://esm.sh/react@17.0.1?dev'),
    `/-/esm.sh/[${btoa('dev').replace(/[+/=]/g, '')}]react@17.0.1`
  )
  assertEquals(
    toLocalUrl('https://esm.sh/react@17.0.1?target=es2015&dev'),
    `/-/esm.sh/[${btoa('target=es2015&dev').replace(/[+/=]/g, '')}]react@17.0.1`
  )
  assertEquals(
    toLocalUrl('http://localhost/mod.ts'),
    '/-/http_localhost/mod.ts'
  )
  assertEquals(
    toLocalUrl('http://localhost:80/mod.ts'),
    '/-/http_localhost/mod.ts'
  )
  assertEquals(
    toLocalUrl('http://localhost:8080/mod.ts'),
    '/-/http_localhost_8080/mod.ts'
  )
  assertEquals(
    toLocalUrl('file:///mod.ts'),
    '/mod.ts'
  )
})

Deno.test('server/helper isLoaderPlugin false', () => {
  const loader = {} as LoaderPlugin
  loader.type = 'foobar' as 'loader'

  assert(!isLoaderPlugin(loader))
})

Deno.test('server/helper isLoaderPlugin true', () => {
  const loader = {} as LoaderPlugin
  loader.type = 'loader'

  assert(isLoaderPlugin(loader))
})

Deno.test('server/helper getAlephPkgUri dev', () => {
  const port = 1234
  Deno.env.set('ALEPH_DEV_PORT', port.toString())

  assert(getAlephPkgUri().endsWith(port.toString()))
})

Deno.test('server/helper: getAlephPkgUri non-dev', () => {
  Deno.env.set('ALEPH_DEV_PORT', '')

  assert(getAlephPkgUri().endsWith(VERSION))
})

Deno.test('server/helper: getRelativePath', () => {

  // relative() fcn shows how you would change directory(cd)
  // to get from the 'from' folder to the 'to' folder. Examples:
  // assertEquals(relative('/baz/foobar', '/baz/aleph'), '../aleph')
  // assertEquals(relative('\\baz\\foobar', '\\baz\\aleph'), '..\\aleph')

  assertEquals(getRelativePath('/baz/foobar', '/baz/aleph'), '../aleph')
  assertEquals(getRelativePath('baz/foobar', 'baz/aleph'), '../aleph')
  assertEquals(getRelativePath('baz/foobar', 'baz/foobar/aleph'), './aleph')

})

Deno.test('server/helper: toLocalUrl()', () => {
  assertEquals(toLocalUrl('https://deno.land/x/aleph@v0.3.0-alpha.29/'), '/-/deno.land/x/aleph@v0.3.0-alpha.29/')
  assertEquals(toLocalUrl('http://foo.com/bar?lang=us-en'), '/-/http_foo.com/[bGFuZz11cy1lbg]bar')
  assertEquals(toLocalUrl('http://foo.com:8080/bar'), '/-/http_foo.com_8080/bar')
  assertEquals(toLocalUrl('file://foo/bar/'), 'foo/bar/')
  assertEquals(toLocalUrl('/foo/bar/'), '/foo/bar/')
})

Deno.test('server/helper: computeHash', () => {
  assertEquals(computeHash('hello world!'), '430ce34d020724ed75a196dfc2ad67c77772d169')
  assertEquals(computeHash(new Uint8Array([21, 31])), 'b0d04c3ac51b86296251d73c20f348e9ae0042a4')
})


Deno.test('server/helper: clearCompilation', async () => {
  // TODO: The clearCompilation function is empty and
  // needs to be implemented or removed
  assertEquals(await clearCompilation('helper.ts'), undefined)
  console.warn('The clearCompilation function needs to be implemented or removed')
})

Deno.test('server/helper: parsePortNumber', () => {
  assertEquals(parsePortNumber('1234'), 1234)
  assertEquals(parsePortNumber('1234.1234'), 1234)

  assertThrows(() => parsePortNumber('asdfasfd'))
  assertThrows(() => parsePortNumber('-1222'))
  // 1 << 16 = 65536
  assertThrows(() => parsePortNumber('65536'))
  assertThrows(() => parsePortNumber('65537'))
  assertEquals(parsePortNumber('65535'), 65535)
})

Deno.test('server/helper: getFlag', () => {
  type FlagKeys = 'allow-read' | 'allow-write' | 'allow-env'
  const flags: Record<FlagKeys, any> = {
    'allow-read': './src',
    'allow-write': './src/tmp',
    'allow-env': false
  }
  // key value found
  assertEquals(getFlag(flags, ['allow-read']), flags['allow-read'])
  // key value found in keys array
  assertEquals(getFlag(flags, ['allow-foobar', 'allow-write']), flags['allow-write'])
  // default value returned for unknown key
  assertEquals(getFlag(flags, ['allow-whatever'], 'foobar'), 'foobar')
  // undefined returned for unknown key without default
  assertEquals(getFlag(flags, ['allow-whatever']), undefined)
  // non-string value returned as string
  assertEquals(getFlag(flags, ['allow-env']), flags['allow-env'].toString())
})

Deno.test('server/helper formatBytesWithColor', () => {

  // 10 << 20 = 10485760 (10MB)
  const TenLeftShift20 = 10485760
  // 1 << 20 = 1048576 (1MB)
  const OneLeftShift20 = 1048576

  const OneMb = OneLeftShift20
  // "\x1b[2m1018KB\x1b[22m"
  assertEquals(formatBytesWithColor(OneMb), "\x1b[2m1MB\x1b[22m")
  const TwoMb = OneLeftShift20 + 1024
  // "\x1b[33m2MB\x1b[39m"
  assertEquals(formatBytesWithColor(TwoMb), "\x1b[33m2MB\x1b[39m")
  const ElevenMb = TenLeftShift20 + 1024
  // "\x1b[31m11MB\x1b[39m"
  assertEquals(formatBytesWithColor(ElevenMb), "\x1b[31m11MB\x1b[39m")
})