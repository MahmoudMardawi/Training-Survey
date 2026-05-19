// netlify/functions/admin-logout.js
export default async () => {
  const cookieStr = 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr },
  });
};

export const config = { path: '/api/admin/logout' };
