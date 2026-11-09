// Genera un secreto para el segundo factor (TOTP) del login. Uso: npm run totp
import { newTotpSecret, otpauthUri } from '../server/utils/totp.js';

const secret = newTotpSecret();
console.log(`
Segundo factor (TOTP) para Telegram Drive

1) Añade esta línea a tu .env y reinicia el servicio:

   APP_TOTP_SECRET=${secret}

2) En tu app de autenticación (Google Authenticator, Aegis, 1Password, Authy…) añade una cuenta
   con "Introducir clave de configuración" y pega el secreto:  ${secret}
   (Tipo: basada en tiempo · 6 dígitos · 30 s). También vale este enlace otpauth:

   ${otpauthUri(secret)}

3) Desde ese momento el login pedirá contraseña + código de 6 dígitos.
   Para desactivarlo, borra APP_TOTP_SECRET del .env.
`);
