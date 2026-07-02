export function professionalContactTemplate(data: {
  senderName: string;
  senderEmail: string;
  message: string;
}): { subject: string; html: string } {
  const date = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return {
    subject: 'Nueva consulta profesional en Trama CoWork',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
    <p style="color: #999; margin: 0;">Solicitud de contacto profesional</p>
  </div>

  <div style="background-color: #f0f9ff; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #2c3e50; width: 120px;">Remitente:</td>
        <td style="padding: 8px 0;">${data.senderName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Email:</td>
        <td style="padding: 8px 0;"><a href="mailto:${data.senderEmail}" style="color: #3498db;">${data.senderEmail}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Fecha:</td>
        <td style="padding: 8px 0;">${date}</td>
      </tr>
    </table>
  </div>

  <h3 style="color: #2c3e50;">Mensaje:</h3>
  <div style="background-color: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${data.message}</div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este mensaje fue enviado desde el formulario público de Trama CoWork.
  </p>
</body>
</html>`,
  };
}
