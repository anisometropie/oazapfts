import ts from 'typescript';
export declare const questionToken: ts.PunctuationToken<ts.SyntaxKind.QuestionToken>;
export declare function createQuestionToken(
  token?: boolean | ts.QuestionToken,
): ts.QuestionToken | undefined;
export declare const keywordType: {
  any: ts.KeywordTypeNode<ts.SyntaxKind.AnyKeyword>;
  number: ts.KeywordTypeNode<ts.SyntaxKind.NumberKeyword>;
  object: ts.KeywordTypeNode<ts.SyntaxKind.ObjectKeyword>;
  string: ts.KeywordTypeNode<ts.SyntaxKind.StringKeyword>;
  boolean: ts.KeywordTypeNode<ts.SyntaxKind.BooleanKeyword>;
  undefined: ts.KeywordTypeNode<ts.SyntaxKind.UndefinedKeyword>;
  void: ts.KeywordTypeNode<ts.SyntaxKind.VoidKeyword>;
  null: ts.LiteralTypeNode;
};
type KeywordTypeName = keyof typeof keywordType;
export declare function createKeywordType(
  type: KeywordTypeName,
):
  | ts.KeywordTypeNode<ts.SyntaxKind.AnyKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.NumberKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.ObjectKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.StringKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.BooleanKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.UndefinedKeyword>
  | ts.KeywordTypeNode<ts.SyntaxKind.VoidKeyword>
  | ts.LiteralTypeNode;
export declare const modifier: {
  async: ts.ModifierToken<ts.SyntaxKind.AsyncKeyword>;
  export: ts.ModifierToken<ts.SyntaxKind.ExportKeyword>;
};
export declare function createLiteral(
  v: string | boolean | number,
): ts.StringLiteral | ts.TrueLiteral | ts.FalseLiteral | ts.NumericLiteral;
export declare function createEnumTypeNode(
  values: Array<string | boolean | number>,
): ts.LiteralTypeNode | ts.UnionTypeNode;
export declare function createTypeAliasDeclaration({
  modifiers,
  name,
  typeParameters,
  type,
}: {
  modifiers?: Array<ts.Modifier>;
  name: string | ts.Identifier;
  typeParameters?: Array<ts.TypeParameterDeclaration>;
  type: ts.TypeNode;
}): ts.TypeAliasDeclaration;
export declare function createIntefaceAliasDeclaration({
  modifiers,
  name,
  typeParameters,
  type,
  inheritedNodeNames,
}: {
  modifiers?: Array<ts.Modifier>;
  name: string | ts.Identifier;
  typeParameters?: Array<ts.TypeParameterDeclaration>;
  type: ts.TypeNode;
  inheritedNodeNames?: (string | ts.Identifier)[];
}): ts.InterfaceDeclaration;
export declare function toExpression(ex: ts.Expression | string): ts.Expression;
export declare function createCall(
  expression: ts.Expression | string,
  {
    typeArgs,
    args,
  }?: {
    typeArgs?: Array<ts.TypeNode>;
    args?: Array<ts.Expression>;
  },
): ts.CallExpression;
export declare function createMethodCall(
  method: string,
  opts: {
    typeArgs?: Array<ts.TypeNode>;
    args?: Array<ts.Expression>;
  },
): ts.CallExpression;
export declare function createObjectLiteral(
  props: [string, string | ts.Expression][],
): ts.ObjectLiteralExpression;
export declare function createPropertyAssignment(
  name: string,
  expression: ts.Expression,
): ts.PropertyAssignment | ts.ShorthandPropertyAssignment;
export declare function block(...statements: ts.Statement[]): ts.Block;
export declare function createArrowFunction(
  parameters: ts.ParameterDeclaration[],
  body: ts.ConciseBody,
  {
    modifiers,
    typeParameters,
    type,
    equalsGreaterThanToken,
  }?: {
    modifiers?: ts.Modifier[];
    typeParameters?: ts.TypeParameterDeclaration[];
    type?: ts.TypeNode;
    equalsGreaterThanToken?: ts.EqualsGreaterThanToken;
  },
): ts.ArrowFunction;
export declare function createFunctionDeclaration(
  name: string | ts.Identifier | undefined,
  {
    modifiers,
    asteriskToken,
    typeParameters,
    type,
  }: {
    modifiers?: ts.Modifier[];
    asteriskToken?: ts.AsteriskToken;
    typeParameters?: ts.TypeParameterDeclaration[];
    type?: ts.TypeNode;
  },
  parameters: ts.ParameterDeclaration[],
  body?: ts.Block,
): ts.FunctionDeclaration;
export declare function createClassDeclaration({
  modifiers,
  name,
  typeParameters,
  heritageClauses,
  members,
}: {
  modifiers?: Array<ts.Modifier>;
  name?: string | ts.Identifier;
  typeParameters?: Array<ts.TypeParameterDeclaration>;
  heritageClauses?: Array<ts.HeritageClause>;
  members: Array<ts.ClassElement>;
}): ts.ClassDeclaration;
export declare function createConstructor({
  modifiers,
  parameters,
  body,
}: {
  modifiers?: Array<ts.Modifier>;
  parameters: Array<ts.ParameterDeclaration>;
  body?: ts.Block;
}): ts.ConstructorDeclaration;
export declare function createMethod(
  name:
    | string
    | ts.Identifier
    | ts.StringLiteral
    | ts.NumericLiteral
    | ts.ComputedPropertyName,
  {
    modifiers,
    asteriskToken,
    questionToken,
    typeParameters,
    type,
  }?: {
    modifiers?: ts.Modifier[];
    asteriskToken?: ts.AsteriskToken;
    questionToken?: ts.QuestionToken | boolean;
    typeParameters?: ts.TypeParameterDeclaration[];
    type?: ts.TypeNode;
  },
  parameters?: ts.ParameterDeclaration[],
  body?: ts.Block,
): ts.MethodDeclaration;
export declare function createParameter(
  name: string | ts.BindingName,
  {
    modifiers,
    dotDotDotToken,
    questionToken,
    type,
    initializer,
  }: {
    modifiers?: Array<ts.Modifier>;
    dotDotDotToken?: ts.DotDotDotToken;
    questionToken?: ts.QuestionToken | boolean;
    type?: ts.TypeNode;
    initializer?: ts.Expression;
  },
): ts.ParameterDeclaration;
export declare function createPropertySignature({
  modifiers,
  name,
  questionToken,
  type,
}: {
  modifiers?: Array<ts.Modifier>;
  name: ts.PropertyName | string;
  questionToken?: ts.QuestionToken | boolean;
  type?: ts.TypeNode;
}): ts.PropertySignature;
export declare function createIndexSignature(
  type: ts.TypeNode,
  {
    modifiers,
    indexName,
    indexType,
  }?: {
    indexName?: string;
    indexType?: ts.TypeNode;
    modifiers?: Array<ts.Modifier>;
  },
): ts.IndexSignatureDeclaration;
export declare function createObjectBinding(
  elements: Array<{
    name: string | ts.BindingName;
    dotDotDotToken?: ts.DotDotDotToken;
    propertyName?: string | ts.PropertyName;
    initializer?: ts.Expression;
  }>,
): ts.ObjectBindingPattern;
export declare function createTemplateString(
  head: string,
  spans: Array<{
    literal: string;
    expression: ts.Expression;
  }>,
): ts.StringLiteral | ts.TemplateExpression;
export declare function findNode<T extends ts.Node>(
  nodes: ts.NodeArray<ts.Node>,
  kind: T extends {
    kind: infer K;
  }
    ? K
    : never,
  test?: (node: T) => boolean | undefined,
): T;
export declare function getName(name: ts.Node):
  | string
  | (void & {
      __escapedIdentifier: void;
    });
export declare function getFirstDeclarationName(n: ts.VariableStatement):
  | string
  | (void & {
      __escapedIdentifier: void;
    });
export declare function findFirstVariableDeclaration(
  nodes: ts.NodeArray<ts.Node>,
  name: string,
): ts.VariableDeclaration;
export declare function changePropertyValue(
  o: ts.ObjectLiteralExpression,
  property: string,
  value: ts.Expression,
): void;
export declare function appendNodes<T extends ts.Node>(
  array: ts.NodeArray<T>,
  ...nodes: T[]
): ts.NodeArray<T>;
export declare function addComment<T extends ts.Node>(
  node: T,
  comment?: string,
): T;
export declare function parseFile(file: string): ts.SourceFile;
export declare function printNode(node: ts.Node): string;
export declare function printNodes(nodes: ts.Node[]): string;
export declare function printFile(sourceFile: ts.SourceFile): string;
export declare function isValidIdentifier(str: string): boolean;
export {};