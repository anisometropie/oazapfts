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
const Oazapfts = __importStar(require('.'));
const __1 = require('../');
const oazapfts = Oazapfts.runtime({});
const fetchMock = () => ({
  ok: true,
  text: 'hello',
  headers: {
    get: name => undefined,
  },
});
describe('request', () => {
  let g;
  beforeAll(() => {
    g = global;
    g.fetch = g.fetch || (() => {});
  });
  it('should use global fetch', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      jest.spyOn(g, 'fetch').mockImplementationOnce(fetchMock);
      yield oazapfts.fetchText('bar', { baseUrl: 'foo/' });
      expect(g.fetch).toHaveBeenCalledWith('foo/bar', expect.any(Object));
    }));
  it('should not use global fetch if local is provided', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      jest.spyOn(g, 'fetch');
      const customFetch = jest.fn(fetchMock);
      yield oazapfts.fetchText('bar', {
        baseUrl: 'foo/',
        fetch: customFetch,
      });
      expect(customFetch).toHaveBeenCalledWith('foo/bar', expect.any(Object));
      expect(g.fetch).not.toHaveBeenCalled();
    }));
  it('should throw error with headers', () =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const fn = () =>
        (0, __1.ok)(
          oazapfts.fetchText('bar', {
            fetch: () =>
              __awaiter(void 0, void 0, void 0, function* () {
                return new Response('', {
                  status: 401,
                  headers: { 'x-request-id': '1234' },
                });
              }),
          }),
        );
      let throwed;
      let err;
      try {
        yield fn();
      } catch (e) {
        err = e;
        throwed = true;
      }
      expect(throwed).toBe(true);
      expect(err).toBeInstanceOf(__1.HttpError);
      expect(
        (_a = err === null || err === void 0 ? void 0 : err.headers) === null ||
          _a === void 0
          ? void 0
          : _a.get('x-request-id'),
      ).toBe('1234');
    }));
  it("should allow 'Content-Type' header to be customized", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const jsonUTF8ContentType = 'application/json; charset=UTF-8';
      const formUTF8ContentType =
        'application/x-www-form-urlencoded; charset=UTF-8';
      const jsonResponse = oazapfts.json({
        body: { value: 'body value' },
        headers: { 'Content-Type': jsonUTF8ContentType },
      });
      const formResponse = oazapfts.form({
        body: { value: 'body value' },
        headers: { 'Content-Type': formUTF8ContentType },
      });
      expect(jsonResponse.headers['Content-Type']).toEqual(jsonUTF8ContentType);
      expect(formResponse.headers['Content-Type']).toEqual(formUTF8ContentType);
    }));
});
//# sourceMappingURL=index.test.js.map