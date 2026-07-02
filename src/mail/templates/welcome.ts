export function welcomeTemplate(name?: string): {
  subject: string;
  html: string;
} {
  const greeting = name ? `Hola <strong>${name}</strong>,` : 'Hola,';

  return {
    subject: '¡Bienvenido/a a Trama CoWork!',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #3498db;">¡Tu cuenta fue creada exitosamente!</h2>

  <p>${greeting}</p>

  <p>Te damos la bienvenida a <strong>Trama CoWork</strong>, la comunidad de profesionales independientes.</p>

  <p>Ya podés:</p>
  <ul>
    <li>Completar tu perfil profesional</li>
    <li>Explorar la comunidad y conectar con otros profesionales</li>
    <li>Acceder a oportunidades laborales</li>
    <li>Participar en los canales de la comunidad</li>
  </ul>

  <p>Te recomendamos completar tu perfil cuanto antes para aumentar tu visibilidad dentro de la plataforma.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Completar mi perfil</a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automatico de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
