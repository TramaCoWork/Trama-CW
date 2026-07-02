export function profileRejectedTemplate(
  name: string,
  notes?: string,
): { subject: string; html: string } {
  const notesSection = notes
    ? `
  <div style="background-color: #fef3e2; border-left: 4px solid #e67e22; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
    <strong>Observaciones del equipo:</strong>
    <p style="margin: 10px 0 0 0;">${notes}</p>
  </div>`
    : '';

  return {
    subject: 'Actualización sobre tu perfil en Trama',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #e67e22;">Tu perfil necesita ajustes</h2>

  <p>Hola <strong>${name}</strong>,</p>

  <p>Revisamos tu perfil profesional y necesitamos que realices algunos ajustes antes de poder aprobarlo.</p>

  ${notesSection}

  <p>Por favor, revisá las observaciones y actualizá tu perfil. Una vez que hagas los cambios, podés volver a enviarlo para revisión.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="#" style="background-color: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Editar mi perfil</a>
  </div>

  <p style="font-size: 14px; color: #666;">Si tenés dudas, no dudes en contactarnos.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automático de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
