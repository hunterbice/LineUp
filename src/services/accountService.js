export function createAccountService({ deviceFunctionRequest }) {
  function request(action, extra) {
    return deviceFunctionRequest("account-sync", Object.assign({ action: action }, extra || {}));
  }

  return { request };
}
