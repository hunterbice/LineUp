export function createLocationService({ deviceFunctionRequest }) {
  function sendLocationIngest(payload) {
    return deviceFunctionRequest("location-ingest", payload);
  }

  return { sendLocationIngest };
}
