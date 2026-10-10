declare module 'gltf-validator' {
  interface Report {
    issues: { messages: { severity: number; code: string; message: string }[] };
  }
  export function validateBytes(data: Uint8Array): Promise<Report>;
  const validator: { validateBytes: typeof validateBytes };
  export default validator;
}
