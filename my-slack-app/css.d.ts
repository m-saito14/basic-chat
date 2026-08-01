// Global CSS side-effect imports (e.g. `import "./globals.css"`).
// Next.js のビルトイン型は CSS Modules (*.module.css) のみを宣言しており、
// プレーンな CSS の副作用 import には型宣言がないため、ここで補う。
// (TypeScript 6.0 以降は side-effect import を既定で型チェックするため必要)
declare module "*.css";
