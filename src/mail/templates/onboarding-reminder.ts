export function onboardingReminderTemplate(name: string): {
  subject: string;
  html: string;
} {
  return {
    subject: '¿Necesitás ayuda para completar tu perfil en Trama Cowork?',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #3498db;">¿Necesitás ayuda para completar tu perfil?</h2>

  <p>Hola <strong>${name}</strong>,</p>

  <p>Detectamos que tenés inconvenientes para completar tu perfil en Trama Cowork. Si necesitás ayuda, no dudes en contactarnos — estamos para ayudarte.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://tramacowork.com/contacto/" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir al formulario de contacto</a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automático de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
