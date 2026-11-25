import { copyFileSync, mkdirSync } from 'node:fs'
mkdirSync('public/vendor', { recursive: true })
copyFileSync('node_modules/jsqr/dist/jsQR.js', 'public/vendor/jsQR.js')
copyFileSync('node_modules/jsqr/LICENSE', 'public/vendor/jsQR.LICENSE')
// Build minificado oficial da mesma versão (metade do tamanho para a RA no celular).
copyFileSync('node_modules/three/build/three.module.min.js', 'public/vendor/three.module.min.js')
copyFileSync('node_modules/three/LICENSE', 'public/vendor/three.LICENSE')
console.log('Leitor QR local preparado: jsQR 1.4.0.')
