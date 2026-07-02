export function trialExpiringReminderTemplate(name: string): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Tu período de prueba en Trama vence en 5 días',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #3498db;">Tu período de prueba está por vencer</h2>

  <p>Hola <strong>${name}</strong>,</p>

  <p>Tu período de prueba en Trama Cowork está por vencer en 5 días. Para continuar con tu perfil público y seguir siendo visible para potenciales clientes, necesitás suscribirte a uno de nuestros planes.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://tramacowork.com/login/" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver planes y suscribirme</a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automático de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
