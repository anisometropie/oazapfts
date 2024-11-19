import ts from 'typescript';
import { OpenAPIV3 } from 'openapi-types';
import { Opts } from '.';
export declare const verbs: string[];
type ContentType = 'json' | 'form' | 'multipart';
type OnlyMode = 'readOnly' | 'writeOnly';
type OnlyModes = Record<OnlyMode, boolean>;
export declare function isMimeType(s: unknown): boolean;
export declare function isJsonMimeType(mime: string): boolean;
export declare function getBodyFormatter(
  body?: OpenAPIV3.RequestBodyObject,
): ContentType | undefined;
type SchemaObject = OpenAPIV3.SchemaObject & {
  const?: unknown;
  'x-enumNames'?: string[];
  'x-enum-varnames'?: string[];
  'x-component-ref-path'?: string;
  prefixItems?: (OpenAPIV3.ReferenceObject | SchemaObject)[];
};
/**
 * Get the name of a formatter function for a given parameter.
 */
export declare function getFormatter({
  style,
  explode,
  content,
}: OpenAPIV3.ParameterObject):
  | 'json'
  | 'form'
  | 'deep'
  | 'explode'
  | 'space'
  | 'pipe';
export declare function getOperationIdentifier(id?: string): string | undefined;
/**
 * Create a method name for a given operation, either from its operationId or
 * the HTTP verb and path.
 */
export declare function getOperationName(
  verb: string,
  path: string,
  operationId?: string,
): string;
export declare function isNullable(
  schema?: SchemaObject | OpenAPIV3.ReferenceObject,
): boolean | undefined;
export declare function isReference(
  obj: unknown,
): obj is OpenAPIV3.ReferenceObject;
/**
 * Converts a local reference path into an array of property names.
 */
export declare function refPathToPropertyPath(ref: string): string[];
/**
 * If the given object is a ReferenceObject, return the last part of its path.
 */
export declare function getReferenceName(obj: unknown): string | undefined;
export declare function toIdentifier(
  s: string,
  upperFirst?: boolean,
  onlyMode?: OnlyMode,
): string;
/**
 * Create a template string literal from the given OpenAPI urlTemplate.
 * Curly braces in the path are turned into identifier expressions,
 * which are read from the local scope during runtime.
 */
export declare function createUrlExpression(
  path: string,
  qs?: ts.Expression,
): ts.StringLiteral | ts.TemplateExpression;
/**
 * Create a call expression for one of the QS runtime functions.
 */
export declare function callQsFunction(
  name: string,
  args: ts.Expression[],
): ts.CallExpression;
/**
 * Create a call expression for one of the oazapfts runtime functions.
 */
export declare function callOazapftsFunction(
  name: string,
  args: ts.Expression[],
  typeArgs?: ts.TypeNode[],
): ts.CallExpression;
/**
 * Despite its name, OpenApi's `deepObject` serialization does not support
 * deeply nested objects. As a workaround we detect parameters that contain
 * square brackets and merge them into a single object.
 */
export declare function supportDeepObjects(
  params: OpenAPIV3.ParameterObject[],
): OpenAPIV3.ParameterObject[];
/**
 * Main entry point that generates TypeScript code from a given API spec.
 */
export default class ApiGenerator {
  readonly spec: OpenAPIV3.Document;
  readonly opts: Opts;
  /** Indicates if the document was converted from an older version of the OpenAPI specification. */
  readonly isConverted: boolean;
  constructor(
    spec: OpenAPIV3.Document,
    opts?: Opts,
    /** Indicates if the document was converted from an older version of the OpenAPI specification. */
    isConverted?: boolean,
  );
  discriminatingSchemas: Set<string>;
  aliases: (ts.TypeAliasDeclaration | ts.InterfaceDeclaration)[];
  enumAliases: ts.Statement[];
  enumRefs: Record<
    string,
    {
      values: string;
      type: ts.TypeReferenceNode;
    }
  >;
  refs: Record<
    string,
    {
      base: ts.TypeReferenceNode;
      readOnly?: ts.TypeReferenceNode;
      writeOnly?: ts.TypeReferenceNode;
    }
  >;
  refsOnlyMode: Map<string, OnlyModes>;
  typeAliases: Record<string, number>;
  reset(): void;
  resolve<T>(obj: T | OpenAPIV3.ReferenceObject): T;
  resolveArray<T>(array?: Array<T | OpenAPIV3.ReferenceObject>): T[];
  skip(tags?: string[]): boolean;
  findAvailableRef(ref: string): string;
  getUniqueAlias(name: string): string;
  getEnumUniqueAlias(name: string, values: string): string;
  /**
   * Create a type alias for the schema referenced by the given ReferenceObject
   */
  getRefAlias(
    obj: OpenAPIV3.ReferenceObject,
    onlyMode?: OnlyMode,
    ignoreDiscriminator?: boolean,
  ): ts.TypeNode;
  getSchemaProperties(schema: OpenAPIV3.SchemaObject):
    | {
        [name: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
      }
    | undefined;
  getUnionType(
    variants: (OpenAPIV3.ReferenceObject | SchemaObject)[],
    discriminator?: OpenAPIV3.DiscriminatorObject,
    onlyMode?: OnlyMode,
  ): ts.UnionTypeNode;
  /**
   * Creates a type node from a given schema.
   * Delegates to getBaseTypeFromSchema internally and
   * optionally adds a union with null.
   */
  getTypeFromSchema(
    schema?: SchemaObject | OpenAPIV3.ReferenceObject,
    name?: string,
    onlyMode?: OnlyMode,
  ): ts.TypeNode;
  /**
   * This is the very core of the OpenAPI to TS conversion - it takes a
   * schema and returns the appropriate type.
   */
  getBaseTypeFromSchema(
    schema?: SchemaObject | OpenAPIV3.ReferenceObject,
    name?: string,
    onlyMode?: OnlyMode,
  ): ts.TypeNode;
  isTrueEnum(schema: SchemaObject, name?: string): name is string;
  /**
   * Creates literal type (or union) from an array of values
   */
  getTypeFromEnum(values: unknown[]): ts.LiteralTypeNode | ts.UnionTypeNode;
  getEnumValuesString(values: string[]): string;
  getTrueEnum(schema: SchemaObject, propName: string): ts.TypeReferenceNode;
  /**
   * Checks if readOnly/writeOnly properties are present in the given schema.
   * Returns a tuple of booleans; the first one is about readOnly, the second
   * one is about writeOnly.
   */
  checkSchemaOnlyMode(
    schema: SchemaObject | OpenAPIV3.ReferenceObject,
    resolveRefs?: boolean,
  ): OnlyModes;
  /**
   * Recursively creates a type literal with the given props.
   */
  getTypeFromProperties(
    props: {
      [prop: string]: SchemaObject | OpenAPIV3.ReferenceObject;
    },
    required?: string[],
    additionalProperties?:
      | boolean
      | OpenAPIV3.SchemaObject
      | OpenAPIV3.ReferenceObject,
    onlyMode?: OnlyMode,
  ): ts.TypeLiteralNode;
  getTypeFromResponses(
    responses: OpenAPIV3.ResponsesObject,
    onlyMode?: OnlyMode,
  ): ts.UnionTypeNode;
  getTypeFromResponse(
    resOrRef: OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject,
    onlyMode?: OnlyMode,
  ): ts.TypeNode;
  getResponseType(
    responses?: OpenAPIV3.ResponsesObject,
  ): 'json' | 'text' | 'blob';
  getSchemaFromContent(
    content: Record<string, OpenAPIV3.MediaTypeObject>,
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  getTypeFromParameter(p: OpenAPIV3.ParameterObject): ts.TypeNode;
  wrapResult(ex: ts.Expression): ts.Expression;
  /**
   * Does three things:
   * 1. Add a `x-component-ref-path` property.
   * 2. Record discriminating schemas in `this.discriminatingSchemas`. A discriminating schema
   *    refers to a schema that has a `discriminator` property which is neither used in conjunction
   *    with `oneOf` nor `anyOf`.
   * 3. Make all mappings of discriminating schemas explicit to generate types immediately.
   */
  preprocessComponents(schemas: {
    [key: string]: OpenAPIV3.ReferenceObject | SchemaObject;
  }): void;
  generateApi(): ts.SourceFile;
}
export {};