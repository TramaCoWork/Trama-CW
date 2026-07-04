type DailyDigestChannel = {
  name: string;
  unreadCount: number;
  type: string;
};

export function dailyDigestTemplate(
  channels: DailyDigestChannel[],
): { subject: string; html: string } {
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://tramacowork.com';

  const channelRows = channels
    .map(
      (channel) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #2c3e50;">${channel.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #2c3e50; text-align: center;">${channel.unreadCount}</td>
        </tr>`,
    )
    .join('');

  return {
    subject: 'Tenés posts nuevos en Trama Cowork',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2c3e50; margin-bottom: 5px;">Trama CoWork</h1>
  </div>

  <h2 style="color: #3498db;">Tenés actividad nueva en tus canales</h2>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr>
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #ddd; color: #2c3e50;">Canal</th>
        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #ddd; color: #2c3e50;">Posts nuevos</th>
      </tr>
    </thead>
    <tbody>
      ${channelRows}
    </tbody>
  </table>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${frontendUrl}/comunidad" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver mis canales</a>
  </div>

  <p style="color: #555;">Podés silenciar estas notificaciones desde tu configuración de perfil.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    Este es un mensaje automático de Trama CoWork. No respondas a este email.
  </p>
</body>
</html>`,
  };
}
