function handler(event) {
  // デストラクチャリング + null安全
  const { request } = event ?? {};
  const { headers } = request ?? {};
  const { authorization } = headers ?? {};

  // Basic認証の設定値
  const USERNAME = 'admin';
  const PASSWORD = 'password123';

  // Base64エンコード
  const expectedAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

  // Authorizationヘッダーのチェック（オプショナルチェイニング）
  if (authorization?.value !== `Basic ${expectedAuth}`) {
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
