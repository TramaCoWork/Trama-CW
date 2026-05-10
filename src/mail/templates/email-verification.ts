export function emailVerificationTemplate(verificationUrl: string, name?: string): { subject: string; html: string } {
  const greeting = name ? `Hola <strong>${name}</strong>,` : 'Hola,';

  return {
    subject: 'Verifica tu email - Trama CoWork',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #3498db;">Confirma tu direccion de email</h2>

  <p>${greeting}</p>

  <p>Gracias por registrarte en <strong>Trama CoWork</strong>. Para activar tu cuenta, por favor confirma tu direccion de email haciendo click en el siguiente boton:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${verificationUrl}" style="background-color: #3498db; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verificar mi email</a>
  </div>

  <p style="font-size: 13px; color: #666;">Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
  <p style="font-size: 12px; color: #999; word-break: break-all;">${verificationUrl}</p>

  <p style="font-size: 13px; color: #666;">Este enlace expira en 24 horas. Si no creaste esta cuenta, podes ignorar este email.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automatico de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
