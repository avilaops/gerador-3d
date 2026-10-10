declare module 'gltf-validator' {
  const validator: {
    validateBytes(data: Uint8Array): Promise<{ issues: { messages: { severity: number; code: string; message: string }[] } }>;
  };
  export default validator;
}
