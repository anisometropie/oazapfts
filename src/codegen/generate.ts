import _ from "lodash";
import ts, { factory } from "typescript";
import path from "path";
import { OpenAPIV3 } from "openapi-types";
import * as cg from "./tscodegen";
import generateServers, { defaultBaseUrl } from "./generateServers";
import { Opts } from ".";

export const verbs = [
  "GET",
  "PUT",
  "POST",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
  "TRACE",
];

type ContentType = "json" | "form" | "multipart";

const contentTypes: Record<string, ContentType> = {
  "*/*": "json",
  "application/json": "json",
  "application/x-www-form-urlencoded": "form",
  "multipart/form-data": "multipart",
};

export function isMimeType(s: unknown) {
  return typeof s === "string" && /^[^/]+\/[^/]+$/.test(s);
}

export function isJsonMimeType(mime: string) {
  return contentTypes[mime] === "json" || /\bjson\b/i.test(mime);
}

// augment SchemaObject type to allow slowly adopting new OAS3.1+ features
type SchemaObject = OpenAPIV3.SchemaObject & {
  const?: unknown;
};

/**
 * Get the name of a formatter function for a given parameter.
 */
export function getFormatter({
  style = "form",
  explode = true,
}: OpenAPIV3.ParameterObject) {
  if (explode && style === "deepObject") return "deep";
  if (explode) return "explode";
  if (style === "spaceDelimited") return "space";
  if (style === "pipeDelimited") return "pipe";
  return "form";
}

export function getOperationIdentifier(id?: string) {
  if (!id) return;
  if (id.match(/[^\w\s]/)) return;
  id = _.camelCase(id);
  if (cg.isValidIdentifier(id)) return id;
}

/**
 * Create a method name for a given operation, either from its operationId or
 * the HTTP verb and path.
 */
export function getOperationName(
  verb: string,
  path: string,
  operationId?: string
) {
  const id = getOperationIdentifier(operationId);
  if (id) return id;
  path = path.replace(/\{(.+?)\}/, "by $1").replace(/\{(.+?)\}/, "and $1");
  return toIdentifier(`${verb} ${path}`);
}

export function isNullable(schema?: SchemaObject | OpenAPIV3.ReferenceObject) {
  return schema && !isReference(schema) && schema.nullable;
}

export function isReference(obj: unknown): obj is OpenAPIV3.ReferenceObject {
  return typeof obj === "object" && obj !== null && "$ref" in obj;
}

/**
 * Get the last path component of the given ref.
 */
function getRefBasename(ref: string) {
  return ref.replace(/.+\//, "");
}

/**
 * Returns a name for the given ref that can be used as basis for a type
 * alias. This usually is the baseName, unless the ref ends with a number,
 * in which case the whole ref is returned, with leading non-word characters
 * being stripped.
 */
function getRefName(ref: string) {
  const base = getRefBasename(ref);
  if (/^\d+/.test(base)) {
    return ref.replace(/^\W+/, "");
  }
  return base;
}

/**
 * If the given object is a ReferenceObject, return the last part of its path.
 */
export function getReferenceName(obj: unknown) {
  if (isReference(obj)) {
    return getRefBasename(obj.$ref);
  }
}

export function toIdentifier(s: string) {
  const cc = _.camelCase(s);
  if (cg.isValidIdentifier(cc)) return cc;
  return "$" + cc;
}

/**
 * Create a template string literal from the given OpenAPI urlTemplate.
 * Curly braces in the path are turned into identifier expressions,
 * which are read from the local scope during runtime.
 */
export function createUrlExpression(path: string, qs?: ts.Expression) {
  const spans: Array<{ expression: ts.Expression; literal: string }> = [];
  // Use a replacer function to collect spans as a side effect:
  const head = path.replace(
    /(.*?)\{(.+?)\}(.*?)(?=\{|$)/g,
    (_substr, head, name, literal) => {
      const expression = toIdentifier(name);
      spans.push({
        expression: cg.createCall(
          factory.createIdentifier("encodeURIComponent"),
          { args: [factory.createIdentifier(expression)] }
        ),
        literal,
      });
      return head;
    }
  );

  if (qs) {
    // add the query string as last span
    spans.push({ expression: qs, literal: "" });
  }
  return cg.createTemplateString(head, spans);
}

/**
 * Create a call expression for one of the QS runtime functions.
 */
export function callQsFunction(name: string, args: ts.Expression[]) {
  return cg.createCall(
    factory.createPropertyAccessExpression(
      factory.createIdentifier("QS"),
      name
    ),
    { args }
  );
}

/**
 * Create a call expression for one of the oazapfts runtime functions.
 */
export function callOazapftsFunction(
  name: string,
  args: ts.Expression[],
  typeArgs?: ts.TypeNode[]
) {
  return cg.createCall(
    factory.createPropertyAccessExpression(
      factory.createIdentifier("oazapfts"),
      name
    ),
    { args, typeArgs }
  );
}

/**
 * Despite its name, OpenApi's `deepObject` serialization does not support
 * deeply nested objects. As a workaround we detect parameters that contain
 * square brackets and merge them into a single object.
 */
export function supportDeepObjects(params: OpenAPIV3.ParameterObject[]) {
  const res: OpenAPIV3.ParameterObject[] = [];
  const merged: any = {};
  params.forEach((p) => {
    const m = /^(.+?)\[(.*?)\]/.exec(p.name);
    if (!m) {
      res.push(p);
      return;
    }
    const [, name, prop] = m;
    let obj = merged[name];
    if (!obj) {
      obj = merged[name] = {
        name,
        in: p.in,
        style: "deepObject",
        schema: {
          type: "object",
          properties: {},
        },
      };
      res.push(obj);
    }
    obj.schema.properties[prop] = p.schema;
  });
  return res;
}

/**
 * Main entry point that generates TypeScript code from a given API spec.
 */
export default class ApiGenerator {
  constructor(
    public readonly spec: OpenAPIV3.Document,
    public readonly opts: Opts = {},
    /** Indicates if the document was converted from an older version of the OpenAPI specification. */
    public readonly isConverted = false
  ) {}

  aliases: ts.TypeAliasDeclaration[] = [];

  enumAliases: ts.Statement[] = [];
  enumRefs: Record<string, { values: string; type: ts.TypeReferenceNode }> = {};

  // Collect the types of all referenced schemas so we can export them later
  refs: Record<string, ts.TypeReferenceNode> = {};

  // Keep track of already used type aliases
  typeAliases: Record<string, number> = {};

  reset() {
    this.aliases = [];
    this.enumAliases = [];
    this.refs = {};
    this.typeAliases = {};
  }

  resolve<T>(obj: T | OpenAPIV3.ReferenceObject) {
    if (!isReference(obj)) return obj;
    const ref = obj.$ref;
    if (!ref.startsWith("#/")) {
      throw new Error(
        `External refs are not supported (${ref}). Make sure to call SwaggerParser.bundle() first.`
      );
    }
    const path = ref
      .slice(2)
      .split("/")
      .map((s) => decodeURI(s.replace(/~1/g, "/").replace(/~0/g, "~")));

    const resolved = _.get(this.spec, path);
    if (typeof resolved === "undefined") {
      throw new Error(`Can't find ${path}`);
    }
    return resolved as T;
  }

  resolveArray<T>(array?: Array<T | OpenAPIV3.ReferenceObject>) {
    return array ? array.map((el) => this.resolve(el)) : [];
  }

  skip(tags?: string[]): boolean {
    const excluded = tags && tags.some((t) => this.opts?.exclude?.includes(t));
    if (excluded) {
      return true;
    }
    if (this.opts?.include) {
      const included = tags && tags.some((t) => this.opts.include?.includes(t));
      return !included;
    }
    return false;
  }

  getUniqueAlias(name: string): string {
    let used = this.typeAliases[name] || 0;
    if (used) {
      this.typeAliases[name] = ++used;
      name += used;
    }
    this.typeAliases[name] = 1;
    return name;
  }

  getEnumUniqueAlias(name: string, values: string) {
    // If enum name already exists and have the same values
    if (this.enumRefs[name] && this.enumRefs[name].values == values) {
      return name;
    }

    return this.getUniqueAlias(name);
  }

  /**
   * Create a type alias for the schema referenced by the given ReferenceObject
   */
  getRefAlias(obj: OpenAPIV3.ReferenceObject): ts.TypeReferenceNode {
    const { $ref } = obj;
    let ref = this.refs[$ref];
    if (!ref) {
      const schema = this.resolve<SchemaObject>(obj);
      const name = schema.title || getRefName($ref);
      const identifier = _.upperFirst(toIdentifier(name));
      const alias = this.getUniqueAlias(identifier);

      ref = this.refs[$ref] = factory.createTypeReferenceNode(alias, undefined);

      const type = this.getTypeFromSchema(schema);
      this.aliases.push(
        cg.createTypeAliasDeclaration({
          modifiers: [cg.modifier.export],
          name: alias,
          type,
        })
      );
    }
    return ref;
  }

  getUnionType(
    variants: (OpenAPIV3.ReferenceObject | SchemaObject)[],
    discriminator?: OpenAPIV3.DiscriminatorObject
  ): ts.TypeNode {
    if (discriminator) {
      // oneOf + discriminator -> tagged union (polymorphism)
      if (discriminator.propertyName === undefined) {
        throw new Error("Discriminators require a propertyName");
      }

      // By default, the last component of the ref name (i.e., after the last trailing slash) is
      // used as the discriminator value for each variant. This can be overridden using the
      // discriminator.mapping property.
      const mappedValues = new Set(
        Object.values(discriminator.mapping || {}).map(getRefBasename)
      );

      return factory.createUnionTypeNode(
        (
          [
            ...Object.entries(discriminator.mapping || {}).map(
              ([discriminatorValue, variantRef]) => [
                discriminatorValue,
                { $ref: variantRef },
              ]
            ),
            ...variants
              .filter((variant) => {
                if (!isReference(variant)) {
                  // From the Swagger spec: "When using the discriminator, inline schemas will not be
                  // considered."
                  throw new Error(
                    "Discriminators require references, not inline schemas"
                  );
                }
                return !mappedValues.has(getRefBasename(variant.$ref));
              })
              .map((schema) => [
                getRefBasename((schema as OpenAPIV3.ReferenceObject).$ref),
                schema,
              ]),
          ] as [string, OpenAPIV3.ReferenceObject][]
        ).map(([discriminatorValue, variant]) =>
          // Yields: { [discriminator.propertyName]: discriminatorValue } & variant
          factory.createIntersectionTypeNode([
            factory.createTypeLiteralNode([
              cg.createPropertySignature({
                name: discriminator.propertyName,
                type: factory.createLiteralTypeNode(
                  factory.createStringLiteral(discriminatorValue)
                ),
              }),
            ]),
            this.getTypeFromSchema(variant),
          ])
        )
      );
    } else {
      // oneOf -> untagged union
      return factory.createUnionTypeNode(
        variants.map((schema) => this.getTypeFromSchema(schema))
      );
    }
  }

  /**
   * Creates a type node from a given schema.
   * Delegates to getBaseTypeFromSchema internally and
   * optionally adds a union with null.
   */
  getTypeFromSchema(
    schema?: SchemaObject | OpenAPIV3.ReferenceObject,
    name?: string
  ): ts.TypeNode {
    const type = this.getBaseTypeFromSchema(schema, name);
    return isNullable(schema)
      ? factory.createUnionTypeNode([type, cg.keywordType.null])
      : type;
  }

  /**
   * This is the very core of the OpenAPI to TS conversion - it takes a
   * schema and returns the appropriate type.
   */
  getBaseTypeFromSchema(
    schema?: SchemaObject | OpenAPIV3.ReferenceObject,
    name?: string
  ): ts.TypeNode {
    if (!schema) return cg.keywordType.any;
    if (isReference(schema)) {
      return this.getRefAlias(schema);
    }

    if (schema.oneOf) {
      // oneOf -> union
      return this.getUnionType(schema.oneOf, schema.discriminator);
    }
    if (schema.anyOf) {
      // anyOf -> union
      return factory.createUnionTypeNode(
        schema.anyOf.map((schema) => this.getTypeFromSchema(schema))
      );
    }
    if (schema.allOf) {
      // allOf -> intersection
      const types = schema.allOf.map((schema) =>
        this.getTypeFromSchema(schema)
      );

      if (schema.properties || schema.additionalProperties) {
        // properties -> literal type
        types.push(
          this.getTypeFromProperties(
            schema.properties || {},
            schema.required,
            schema.additionalProperties
          )
        );
      }
      return factory.createIntersectionTypeNode(types);
    }
    if ("items" in schema) {
      // items -> array
      return factory.createArrayTypeNode(this.getTypeFromSchema(schema.items));
    }
    if (schema.properties || schema.additionalProperties) {
      // properties -> literal type
      return this.getTypeFromProperties(
        schema.properties || {},
        schema.required,
        schema.additionalProperties
      );
    }
    if (schema.enum) {
      // enum -> union of literal types
      return cg.createEnumTypeNode(schema.enum);
    }
    if (schema.format == "binary") {
      return factory.createTypeReferenceNode("Blob", []);
    }
    if (schema.const) {
      return this.getTypeFromEnum([schema.const]);
    }
    if (schema.type) {
      // string, boolean, null, number
      if (schema.type === "integer") return cg.keywordType.number;
      if (schema.type in cg.keywordType) return cg.keywordType[schema.type];
    }

    return cg.keywordType.any;
  }

  /**
   * Creates literal type (or union) from an array of values
   */
  getTypeFromEnum(values: unknown[]) {
    const types = values.map((s) => {
      if (s === null) return cg.keywordType.null;
      if (typeof s === "boolean")
        return s
          ? factory.createLiteralTypeNode(
              ts.factory.createToken(ts.SyntaxKind.TrueKeyword)
            )
          : factory.createLiteralTypeNode(
              ts.factory.createToken(ts.SyntaxKind.FalseKeyword)
            );
      if (typeof s === "number")
        return factory.createLiteralTypeNode(factory.createNumericLiteral(s));
      if (typeof s === "string")
        return factory.createLiteralTypeNode(factory.createStringLiteral(s));
      throw new Error(`Unexpected ${String(s)} of type ${typeof s} in enum`);
    });
    return types.length > 1 ? factory.createUnionTypeNode(types) : types[0];
  }

  getEnumValuesString(values: string[]): string {
    return values.join("_");
  }

  /*
    Creates a enum "ref" if not used, reuse existing if values and name matches or creates a new one
    with a new name adding a number
  */
  getTrueEnum(schema: OpenAPIV3.NonArraySchemaObject, propName: string) {
    const proposedName = schema.title || _.upperFirst(propName);
    const stringEnumValue = this.getEnumValuesString(
      schema.enum ? schema.enum : []
    );

    const name = this.getEnumUniqueAlias(proposedName, stringEnumValue);

    if (this.enumRefs[proposedName] && proposedName === name) {
      return this.enumRefs[proposedName].type;
    }

    const values = schema.enum ? schema.enum : [];

    const members = values.map((s, index) => {
      if (schema.type === "boolean") {
        s = Boolean(s) ? "true" : "false";
      } else if (schema.type === "string") {
        s = _.upperFirst(s);
      }
      return factory.createEnumMember(
        factory.createIdentifier(s),
        schema.type === "number"
          ? factory.createNumericLiteral(index)
          : factory.createStringLiteral(s)
      );
    });
    this.enumAliases.push(
      factory.createEnumDeclaration([cg.modifier.export], name, members)
    );

    const type = factory.createTypeReferenceNode(name, undefined);

    this.enumRefs[proposedName] = {
      values: stringEnumValue,
      type: factory.createTypeReferenceNode(name, undefined),
    };

    return type;
  }

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
      | OpenAPIV3.ReferenceObject
  ): ts.TypeLiteralNode {
    const members: ts.TypeElement[] = Object.keys(props).map((name) => {
      const schema = props[name];
      const isRequired = required && required.includes(name);
      let type = this.getTypeFromSchema(schema, name);
      if (!isRequired && this.opts.unionUndefined) {
        type = factory.createUnionTypeNode([type, cg.keywordType.undefined]);
      }
      return cg.createPropertySignature({
        questionToken: !isRequired,
        name,
        type,
      });
    });
    if (additionalProperties) {
      const type =
        additionalProperties === true
          ? cg.keywordType.any
          : this.getTypeFromSchema(additionalProperties);

      members.push(cg.createIndexSignature(type));
    }
    return factory.createTypeLiteralNode(members);
  }

  getTypeFromResponses(responses: OpenAPIV3.ResponsesObject): ts.UnionTypeNode {
    return factory.createUnionTypeNode(
      Object.entries(responses).map(([code, res]) => {
        const statusType =
          code === "default"
            ? cg.keywordType.number
            : factory.createLiteralTypeNode(factory.createNumericLiteral(code));

        const props = [
          cg.createPropertySignature({
            name: "status",
            type: statusType,
          }),
        ];

        const dataType = this.getTypeFromResponse(res);
        if (dataType !== cg.keywordType.void) {
          props.push(
            cg.createPropertySignature({
              name: "data",
              type: dataType,
            })
          );
        }
        return factory.createTypeLiteralNode(props);
      })
    );
  }

  getTypeFromResponse(
    resOrRef: OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject
  ): ts.TypeNode {
    const res = this.resolve(resOrRef);
    if (!res || !res.content) return cg.keywordType.void;
    return this.getTypeFromSchema(this.getSchemaFromContent(res.content));
  }

  getResponseType(
    responses?: OpenAPIV3.ResponsesObject
  ): "json" | "text" | "blob" {
    // backwards-compatibility
    if (!responses) return "text";

    const resolvedResponses = Object.values(responses).map((response) =>
      this.resolve(response)
    );

    // if no content is specified, assume `text` (backwards-compatibility)
    if (
      !resolvedResponses.some(
        (res) => Object.keys(res.content ?? {}).length > 0
      )
    ) {
      return "text";
    }

    const isJson = resolvedResponses.some((response) => {
      const responseMimeTypes = Object.keys(response.content ?? {});
      return responseMimeTypes.some(isJsonMimeType);
    });

    // if there’s `application/json` or `*/*`, assume `json`
    if (isJson) {
      return "json";
    }

    // if there’s `text/*`, assume `text`
    if (
      resolvedResponses.some((res) =>
        Object.keys(res.content ?? []).some((type) => type.startsWith("text/"))
      )
    ) {
      return "text";
    }

    // for the rest, assume `blob`
    return "blob";
  }

  getSchemaFromContent(
    content: Record<string, OpenAPIV3.MediaTypeObject>
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const contentType = Object.keys(content).find(isMimeType);
    if (contentType) {
      const { schema } = content[contentType];
      if (schema) {
        return schema;
      }
    }

    // if no content is specified -> string
    // `text/*` -> string
    if (
      Object.keys(content).length === 0 ||
      Object.keys(content).some((type) => type.startsWith("text/"))
    ) {
      return { type: "string" };
    }

    // rest (e.g. `application/octet-stream`, `application/gzip`, …) -> binary
    return { type: "string", format: "binary" };
  }

  wrapResult(ex: ts.Expression) {
    return this.opts?.optimistic ? callOazapftsFunction("ok", [ex]) : ex;
  }

  generateApi(): ts.SourceFile {
    this.reset();

    // Parse ApiStub.ts so that we don't have to generate everything manually
    const stub = cg.parseFile(
      path.resolve(__dirname, "../../src/codegen/ApiStub.ts")
    );

    // ApiStub contains `const servers = {}`, find it ...
    const servers = cg.findFirstVariableDeclaration(stub.statements, "servers");
    // servers.initializer is readonly, this might break in a future TS version, but works fine for now.
    Object.assign(servers, {
      initializer: generateServers(this.spec.servers || []),
    });

    const { initializer } = cg.findFirstVariableDeclaration(
      stub.statements,
      "defaults"
    );
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
      throw new Error("No object literal: defaults");
    }

    cg.changePropertyValue(
      initializer,
      "baseUrl",
      defaultBaseUrl(this.spec.servers || [])
    );

    // Collect class functions to be added...
    const functions: ts.FunctionDeclaration[] = [];

    // Keep track of names to detect duplicates
    const names: Record<string, number> = {};

    Object.keys(this.spec.paths).forEach((path) => {
      const item = this.spec.paths[path];

      if (!item) {
        return;
      }

      Object.keys(this.resolve(item)).forEach((verb) => {
        const method = verb.toUpperCase();
        // skip summary/description/parameters etc...
        if (!verbs.includes(method)) return;

        const op: OpenAPIV3.OperationObject = (item as any)[verb];
        const {
          operationId,
          requestBody,
          responses,
          summary,
          description,
          tags,
        } = op;

        if (this.skip(tags)) {
          return;
        }

        let name = getOperationName(verb, path, operationId);
        const count = (names[name] = (names[name] || 0) + 1);
        if (count > 1) {
          // The name is already taken, which means that the spec is probably
          // invalid as operationIds must be unique. Since this is quite common
          // nevertheless we append a counter:
          name += count;
        }

        // merge item and op parameters
        const resolvedParameters = this.resolveArray(item.parameters);
        for (const p of this.resolveArray(op.parameters)) {
          const existing = resolvedParameters.find(
            (r) => r.name === p.name && r.in === p.in
          );
          if (!existing) {
            resolvedParameters.push(p);
          }
        }

        // expand older OpenAPI parameters into deepObject style where needed
        const parameters = this.isConverted
          ? supportDeepObjects(resolvedParameters)
          : resolvedParameters;

        // split into required/optional
        const [required, optional] = _.partition(parameters, "required");

        // convert parameter names to argument names ...
        const argNames = new Map<OpenAPIV3.ParameterObject, string>();
        _.sortBy(parameters, "name.length").forEach((p) => {
          const identifier = toIdentifier(p.name);
          const existing = [...argNames.values()];
          const suffix = existing.includes(identifier)
            ? _.upperFirst(p.in)
            : "";
          argNames.set(p, identifier + suffix);
        });

        const getArgName = (param: OpenAPIV3.ParameterObject) => {
          const name = argNames.get(param);
          if (!name) throw new Error(`Can't find parameter: ${param.name}`);
          return name;
        };

        // build the method signature - first all the required parameters
        const methodParams = required.map((p) =>
          cg.createParameter(getArgName(this.resolve(p)), {
            type: this.getTypeFromSchema(isReference(p) ? p : p.schema),
          })
        );

        let body: OpenAPIV3.RequestBodyObject | undefined;
        let bodyVar;

        // add body if present
        if (requestBody) {
          body = this.resolve(requestBody);
          const schema = this.getSchemaFromContent(body.content);
          const type = this.getTypeFromSchema(schema);
          bodyVar = toIdentifier(
            (type as any).name || getReferenceName(schema) || "body"
          );
          methodParams.push(
            cg.createParameter(bodyVar, {
              type,
              questionToken: !body.required,
            })
          );
        }

        // add an object with all optional parameters
        if (optional.length) {
          methodParams.push(
            cg.createParameter(
              cg.createObjectBinding(
                optional
                  .map((param) => this.resolve(param))
                  .map((param) => ({ name: getArgName(param) }))
              ),
              {
                initializer: factory.createObjectLiteralExpression(),
                type: factory.createTypeLiteralNode(
                  optional.map((p) =>
                    cg.createPropertySignature({
                      name: getArgName(this.resolve(p)),
                      questionToken: true,
                      type: this.getTypeFromSchema(
                        isReference(p) ? p : p.schema
                      ),
                    })
                  )
                ),
              }
            )
          );
        }

        methodParams.push(
          cg.createParameter("opts", {
            type: factory.createTypeReferenceNode(
              "Oazapfts.RequestOpts",
              undefined
            ),
            questionToken: true,
          })
        );

        // Next, build the method body...

        const returnType = this.getResponseType(responses);
        const query = parameters.filter((p) => p.in === "query");
        const header = parameters.filter((p) => p.in === "header");

        let qs;
        if (query.length) {
          const paramsByFormatter = _.groupBy(query, getFormatter);
          qs = callQsFunction(
            "query",
            Object.entries(paramsByFormatter).map(([format, params]) => {
              //const [allowReserved, encodeReserved] = _.partition(params, "allowReserved");
              return callQsFunction(format, [
                cg.createObjectLiteral(
                  params.map((p) => [p.name, getArgName(p)])
                ),
              ]);
            })
          );
        }

        const url = createUrlExpression(path, qs);
        const init: ts.ObjectLiteralElementLike[] = [
          factory.createSpreadAssignment(factory.createIdentifier("opts")),
        ];

        if (method !== "GET") {
          init.push(
            factory.createPropertyAssignment(
              "method",
              factory.createStringLiteral(method)
            )
          );
        }

        if (bodyVar) {
          init.push(
            cg.createPropertyAssignment(
              "body",
              factory.createIdentifier(bodyVar)
            )
          );
        }

        if (header.length) {
          init.push(
            factory.createPropertyAssignment(
              "headers",
              factory.createObjectLiteralExpression(
                [
                  factory.createSpreadAssignment(
                    factory.createLogicalAnd(
                      factory.createIdentifier("opts"),
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier("opts"),
                        "headers"
                      )
                    )
                  ),
                  ...header.map((param) =>
                    cg.createPropertyAssignment(
                      param.name,
                      factory.createIdentifier(getArgName(param))
                    )
                  ),
                ],
                true
              )
            )
          );
        }

        const args: ts.Expression[] = [url];

        if (init.length) {
          const m = Object.entries(contentTypes).find(([type]) => {
            return !!_.get(body, ["content", type]);
          });
          const initObj = factory.createObjectLiteralExpression(init, true);
          args.push(m ? callOazapftsFunction(m[1], [initObj]) : initObj); // json, form, multipart
        }

        functions.push(
          cg.addComment(
            cg.createFunctionDeclaration(
              name,
              {
                modifiers: [cg.modifier.export],
              },
              methodParams,
              cg.block(
                factory.createReturnStatement(
                  this.wrapResult(
                    callOazapftsFunction(
                      {
                        json: "fetchJson",
                        text: "fetchText",
                        blob: "fetchBlob",
                      }[returnType],
                      args,
                      returnType === "json" || returnType === "blob"
                        ? [
                            this.getTypeFromResponses(responses!) ||
                              ts.SyntaxKind.AnyKeyword,
                          ]
                        : undefined
                    )
                  )
                )
              )
            ),
            summary || description
          )
        );
      });
    });

    Object.assign(stub, {
      statements: cg.appendNodes(
        stub.statements,
        ...[...this.aliases, ...functions],
        ...this.enumAliases
      ),
    });

    return stub;
  }
}
