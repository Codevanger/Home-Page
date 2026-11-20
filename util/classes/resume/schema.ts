import Ajv, { type ValidateFunction } from 'ajv';
import type { RawResumeData } from '../../interfaces/resume.ts';

export class ResumeSchemaValidator {
  private validator: Promise<ValidateFunction<RawResumeData>> | null = null;

  async validate(data: unknown): Promise<RawResumeData> {
    const validate = await this.getValidator();
    if (!validate(data)) {
      const details = (validate.errors ?? [])
        .map(
          (error) =>
            `${error.instancePath || '/'} ${error.message ?? 'invalid value'}`,
        )
        .join('; ');
      throw Error(`Resume data does not match JSON Schema: ${details}`);
    }
    return data;
  }

  private getValidator(): Promise<ValidateFunction<RawResumeData>> {
    if (!this.validator) {
      this.validator = this.compile().catch((error: unknown) => {
        this.validator = null;
        throw error;
      });
    }
    return this.validator;
  }

  private async compile(): Promise<ValidateFunction<RawResumeData>> {
    const response = await fetch(
      new URL('../../../resume/resume.schema.json', import.meta.url),
    );
    if (!response.ok) throw Error('Could not load resume JSON Schema');
    const schema: object = await response.json();
    return new Ajv({ allErrors: true, strict: true }).compile<RawResumeData>(
      schema,
    );
  }
}
