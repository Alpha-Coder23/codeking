import type { ServerApplication } from '../../types.ts'
import { getAlephPkgUri } from '../../server/helper.ts'

export async function init(app: ServerApplication) {
  if (app.mode == 'development') {
    Object.assign(globalThis, {
      $RefreshReg$: () => { },
      $RefreshSig$: () => (type: any) => type,
    })
    await app.addModule(`${getAlephPkgUri()}/framework/react/refresh.ts`)
  }
}
