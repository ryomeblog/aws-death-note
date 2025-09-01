function handler(event) {
  let request = event.request;
  
  // Basic認証の設定値
  const USERNAME = 'admin';
  const PASSWORD = 'password123';
  
  // Node.jsのBuffer APIを使用してBase64エンコード
  const expectedAuth = Buffer.from(USERNAME + ':' + PASSWORD).toString('base64');
  
  // Authorizationヘッダーのチェック
  if (!request.headers.authorization ||
      request.headers.authorization.value !== 'Basic ' + expectedAuth) {
    // 認証失敗時のレスポンス
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': { value: 'Basic realm="Restricted Area"' },
        'content-type': { value: 'text/html; charset=utf-8' }
      },
      body: '<html><body><h1>401 Unauthorized</h1><p>Authentication required.</p><p>Please provide valid credentials.</p></body></html>',
    };
  }
  
  // 認証成功時はリクエストをそのまま通す
  return request;
}