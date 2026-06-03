export function createRewardService({ deviceFunctionRequest }) {
  function request(action, extra) {
    return deviceFunctionRequest("reward-ledger", Object.assign({ action: action }, extra || {}));
  }

  return { request };
}
