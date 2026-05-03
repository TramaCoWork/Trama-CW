export function profileApprovedTemplate(name: string): { subject: string; html: string } {
  return {
    subject: '¡Bienvenido/a a la comunidad Trama!',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #27ae60;">¡Tu perfil fue aprobado!</h2>

  <p>Hola <strong>${name}</strong>,</p>

  <p>Nos alegra informarte que tu perfil profesional fue revisado y aprobado. Ya formas parte de la comunidad Trama.</p>

  <p>A partir de ahora podrás:</p>
  <ul>
    <li>Ser encontrado/a por otros miembros de la comunidad</li>
    <li>Recibir contactos y oportunidades</li>
    <li>Participar en eventos y actividades</li>
    <li>Acceder a los espacios de trabajo</li>
  </ul>

  <p>Te invitamos a completar tu perfil al máximo para aumentar tu visibilidad.</p>

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
