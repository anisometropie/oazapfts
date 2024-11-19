'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path = __importStar(require('node:path'));
const index_1 = require('./index');
const bootstrap_1 = require('@ts-morph/bootstrap');
const typescript_1 = require('typescript');
/**
 * Generate an API from a releative path and convert it into a single line.
 */
function generate(file, opts = {}) {
  return __awaiter(this, void 0, void 0, function* () {
    const spec = path.join(__dirname, file);
    const src = yield (0, index_1.generateSource)(spec, opts);
    const error = yield checkForTypeErrors(src);
    expect(error).toBeUndefined();
    return src.replace(/\s+/g, ' ');
  });
}
/**
 * Type-check the given TypeScript source code.
 */
function checkForTypeErrors(source) {
  return __awaiter(this, void 0, void 0, function* () {
    const project = yield (0, bootstrap_1.createProject)({
      tsConfigFilePath: __dirname + '/../../tsconfig.json',
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        noEmit: true,
        target: typescript_1.ScriptTarget.ESNext,
        paths: {
          'oazapfts/lib/*': [__dirname + '/../../lib/*'],
        },
      },
    });
    project.createSourceFile(__dirname + '/api.ts', source);
    const program = project.createProgram();
    const [error] = bootstrap_1.ts.getPreEmitDiagnostics(program);
    return error === null || error === void 0 ? void 0 : error.messageText;
  });
}
describe('generateSource', () => {
  it('should generate the same api twice', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const spec = '/../../demo/petstore.json';
      const src1 = yield generate(spec);
      const src2 = yield generate(spec);
      expect(src1).toBe(src2);
    }));
  it('should handle enums as union types', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/../../demo/petstore.json');
      expect(src).toContain(
        `export type Option = ("one" | "two" | "three")[];`,
      );
    }));
  it('should handle properties both inside and outside of allOf', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/allOf.json');
      expect(src).toContain(
        'export type Circle = Shape & { radius?: number; } & { circumference?: number; };',
      );
    }));
  it('should support discriminator used in conjunction with allOf', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/allOf.json');
      expect(src).toContain('export type PetBase = { petType: string; };');
      expect(src).toContain('export type Pet = Dog | Cat | Lizard;');
      expect(src).toContain(
        'export type Dog = { petType: "dog"; } & PetBase & { bark?: string; };',
      );
      expect(src).toContain(
        'export type Lizard = { petType: "Lizard"; } & PetBase & { lovesRocks?: boolean; };',
      );
    }));
  it('should support recursive schemas', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/recursive.yaml');
      expect(src).toContain(
        'export type FolderDto = { name?: string; files?: string[]; folders?: FolderDto[]; };',
      );
    }));
  it('should handle application/geo+json', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/geojson.json');
      expect(src).toContain(
        'return oazapfts.fetchJson<{ status: 200; data: FeatureCollection; }>("/geojson", { ...opts });',
      );
    }));
  it('should generate an api using fetchBlob', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/binary.json');
      expect(src).toContain(
        'return oazapfts.fetchBlob<{ status: 200; data: Blob; }>(`/file/${encodeURIComponent(fileId)}/download`, { ...opts });',
      );
    }));
  it('should generate an api with literal type set to const value', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/const.json');
      expect(src).toContain(`export type Shape = "circle";`);
    }));
  it('should generate valid identifiers', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/invalidIdentifiers.yaml');
      expect(src).toContain('getPets($0Limit: number, { $delete }');
    }));
  it('should not generate duplicate identifiers', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/duplicateIdentifiers.yaml');
      expect(src).toContain('getPetById(id: number, { idQuery }');
    }));
  it('should generate correct array type for prefixItems', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/prefixItems.json');
      expect(src).toContain('export type Coordinates = [ number, number ];');
    }));
  it('should generate valid identifiers for oneOf with refs', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/oneOfRef.yaml');
      expect(src).toContain('PathsFilterGetParameters0SchemaOneOf0');
    }));
  it('should merge properties within oneOf schema variations', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/oneOfMerge.yaml');
      expect(src).toContain(
        '{ param1?: { c: string; d: "enum1" | "enum2"; a?: string; } | { c?: string; d: "enum1" | "enum2"; b: string; }',
      );
    }));
  it('should support parameters specified with content', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/contentParams.json');
      expect(src).toContain(
        'export function queryFiles({ filter }: { filter?: { where?: { fileId?: number; }; }; } = {}, opts?: Oazapfts.RequestOpts)',
      );
      expect(src).toContain(
        'return oazapfts.fetchBlob<{ status: 200; data: Blob; }>(`/file${QS.query(QS.json({ filter }))}`, { ...opts });',
      );
    }));
  it('should generate a base types and extended types with readOnly and writeOnly properties', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/readOnlyWriteOnly.yaml');
      // Base types + Read & Write
      expect(src).toContain(
        'export type ExampleSchema = { always_present: string; }; export type ExampleSchemaRead = { always_present: string; read_only_prop: string; }; export type ExampleSchemaWrite = { always_present: string; write_only_prop: string; }',
      );
      // Parent types using Read/Write nested types
      expect(src).toContain(
        'export type ExampleParentSchema = { child_schema: ExampleSchema; }; export type ExampleParentSchemaRead = { child_schema: ExampleSchemaRead; }; export type ExampleParentSchemaWrite = { child_schema: ExampleSchemaWrite; }',
      );
      // oneOf using Read nested types
      expect(src).toContain('data: ExampleSchemaRead | ExampleBaseSchema');
      // oneOf using Write nested types
      expect(src).toContain('body: ExampleSchemaWrite | ExampleBaseSchema');
      // allOf using Read nested types
      expect(src).toContain('data: ExampleSchemaRead & ExampleBaseSchema');
      // allOf using Write nested types
      expect(src).toContain('body: ExampleSchemaWrite & ExampleBaseSchema');
    }));
  it('should generate merged types with mergeReadWriteOnly', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/readOnlyWriteOnly.yaml', {
        mergeReadWriteOnly: true,
      });
      // Base types + Read & Write
      expect(src).toContain(
        'export type ExampleSchema = { always_present: string; read_only_prop: string; write_only_prop: string; }',
      );
      expect(src).not.toContain('ExampleSchemaRead');
      expect(src).not.toContain('ExampleSchemaWrite');
      // Parent types using Read/Write nested types
      expect(src).toContain(
        'export type ExampleParentSchema = { child_schema: ExampleSchema; };',
      );
      expect(src).not.toContain('ExampleParentSchemaRead');
      expect(src).not.toContain('ExampleParentSchemaWrite');
    }));
  it("shouldn't filter all properties of schema when using readOnly/writeOnly", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const src = yield generate('/__fixtures__/issue-419.json');
      expect(src).toContain('message: string');
    }));
});
describe('useEnumType', () => {
  let src;
  beforeAll(() =>
    __awaiter(void 0, void 0, void 0, function* () {
      src = yield generate('/../../demo/petstore.json', { useEnumType: true });
    }),
  );
  it('should create string enums', () => {
    expect(src).toContain(
      `export enum Status { Available = "available", Pending = "pending", Sold = "sold", Private = "private", $10Percent = "10percent" }`,
    );
  });
  it('should create number enums', () => {
    expect(src).toContain(
      `export enum Size { P = "P", M = "M", G = "G", $0 = "0" }`,
    );
  });
  it('should handle values with the same name', () => {
    expect(src).toContain(
      `export enum Status2 { Placed = "placed", Approved = "approved", Delivered = "delivered" }`,
    );
  });
  it('should avoid name conflicts between types and enums', () => {
    // Type Category is defined as `Category`
    expect(src).toContain(
      `export type Category = { id?: number; name?: string; };`,
    );
    // Enum Category is also defined as `Category` which would be a conflict to type `Category`
    expect(src).not.toContain(`export enum Category {`);
    // Enum Category is defined as `Category2` to avoid name conflict with type Category
    expect(src).toContain(
      `export enum Category2 { Rich = "rich", Wealthy = "wealthy", Poor = "poor" }`,
    );
  });
});
//# sourceMappingURL=index.test.js.map