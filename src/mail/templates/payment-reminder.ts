export function paymentReminderTemplate(
  name: string,
  planName: string,
  paymentUrl: string,
): { subject: string; html: string } {
  return {
    subject: 'Tu suscripción en Trama necesita renovación',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #e67e22;">Tu suscripción necesita renovación</h2>

  <p>Hola <strong>${name}</strong>,</p>

  <p>Tu período de suscripción al plan <strong>${planName}</strong> está por vencer o ya venció. Para seguir siendo visible en la plataforma y mantener tu perfil activo, necesitás renovar tu suscripción.</p>

  <div style="background-color: #fff8e1; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0 0 10px 0; font-weight: bold; color: #2c3e50;">¿Qué pasa si no renovás?</p>
    <p style="margin: 0; color: #555;">Tu perfil dejará de ser visible para la comunidad. Podrás reactivarlo en cualquier momento realizando el pago.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${paymentUrl}" style="background-color: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Renovar mi suscripción</a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automático de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
