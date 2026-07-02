export function profileApprovedTemplate(name: string): {
  subject: string;
  html: string;
} {
  return {
    subject: '¡Felicitaciones! Tu perfil fue aprobado en Trama',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #27ae60;">¡Felicitaciones, tu perfil fue aprobado!</h2>

  <p>Hola <strong>${name}</strong>,</p>

  <p>Nos alegra informarte que tu perfil profesional fue revisado y <strong>aprobado exitosamente</strong>. ¡Ya formas parte de la comunidad Trama!</p>

  <div style="background-color: #f0f9ff; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0 0 10px 0; font-weight: bold; color: #2c3e50;">🎁 15 días gratis para que te conozcan</p>
    <p style="margin: 0; color: #555;">Tu perfil estará visible para toda la comunidad durante los próximos <strong>15 días de forma gratuita</strong>. Durante este período podrás:</p>
  </div>

  <ul>
    <li>Ser encontrado/a por otros miembros de la comunidad</li>
    <li>Recibir contactos y oportunidades</li>
    <li>Participar en eventos y actividades</li>
    <li>Acceder a los espacios de trabajo</li>
  </ul>

  <div style="background-color: #fff8e1; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0 0 10px 0; font-weight: bold; color: #2c3e50;">📌 ¿Qué pasa después de los 15 días?</p>
    <p style="margin: 0; color: #555;">Para seguir siendo visible en la plataforma, necesitarás activar tu suscripción. Podés hacerlo en cualquier momento desde tu perfil.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir a mi perfil</a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automático de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
