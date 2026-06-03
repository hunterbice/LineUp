export function createLineupApiService({ supabaseUrl, supabaseKey, getHeaders, withDeviceProof }) {
  function functionRequest(name, body, headers) {
    return fetch(supabaseUrl + "/functions/v1/" + name, {
      method: "POST",
      headers: headers || getHeaders(),
      body: JSON.stringify(body || {}),
    }).then(function(response) {
      return response.json().catch(function() {
        return {};
      }).then(function(data) {
        if (!response.ok) throw Object.assign(new Error(data.error || name + " failed"), { status: response.status, data: data });
        return data;
      });
    });
  }

  function deviceFunctionRequest(name, body, headers) {
    return withDeviceProof(body || {}).then(function(provenBody) {
      return functionRequest(name, provenBody, headers);
    });
  }

  function rawDevicePost(path, body, headers) {
    return withDeviceProof(body || {}).then(function(provenBody) {
      return fetch(supabaseUrl + path, {
        method: "POST",
        headers: headers || getHeaders(),
        body: JSON.stringify(provenBody),
      });
    });
  }

  function publicFunctionRequest(name, body) {
    return functionRequest(name, body, { "Content-Type": "application/json", apikey: supabaseKey });
  }

  return { functionRequest, deviceFunctionRequest, rawDevicePost, publicFunctionRequest };
}
