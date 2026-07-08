import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

const unwrapExpression = (node) => {
  let current = node;
  while (
    current?.type === "ChainExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSNonNullExpression" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "TSInstantiationExpression" ||
    current?.type === "TSParenthesizedExpression"
  ) {
    current = current.expression;
  }
  return current;
};

const isIdentifier = (node, name) => {
  const expression = unwrapExpression(node);
  return expression?.type === "Identifier" && (name === undefined || expression.name === name);
};

const getPropertyName = (node) => {
  const expression = unwrapExpression(node);
  if (expression?.type === "Identifier") return expression.name;
  if (expression?.type === "Literal" && typeof expression.value === "string") {
    return expression.value;
  }
  return undefined;
};

const isStringLiteral = (node, value) =>
  node?.type === "Literal" && typeof node.value === "string" && node.value === value;

const isTestLike = (filename) => /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(filename);

const schemaCompilerMethods = new Set([
  "asserts",
  "decode",
  "decodeEffect",
  "decodeExit",
  "decodeOption",
  "decodePromise",
  "decodeResult",
  "decodeSync",
  "decodeUnknown",
  "decodeUnknownEffect",
  "decodeUnknownExit",
  "decodeUnknownOption",
  "decodeUnknownPromise",
  "decodeUnknownResult",
  "decodeUnknownSync",
  "encode",
  "encodeEffect",
  "encodeExit",
  "encodeOption",
  "encodePromise",
  "encodeResult",
  "encodeSync",
  "encodeUnknown",
  "encodeUnknownEffect",
  "encodeUnknownExit",
  "encodeUnknownOption",
  "encodeUnknownPromise",
  "encodeUnknownResult",
  "encodeUnknownSync",
  "is",
  "parse",
  "parseEither",
  "parseOption",
  "parsePromise",
  "parseSync",
  "validate",
  "validateEither",
  "validateOption",
  "validatePromise",
  "validateSync",
]);

const getSchemaCompilerMethod = (callee) => {
  const expression = unwrapExpression(callee);
  if (expression?.type !== "MemberExpression") return undefined;
  if (!isIdentifier(expression.object, "Schema")) return undefined;

  const method = getPropertyName(expression.property);
  return method !== undefined && schemaCompilerMethods.has(method) ? method : undefined;
};

const isNestedSchemaCall = (node) => {
  const expression = unwrapExpression(node);
  if (expression?.type !== "CallExpression") return false;

  const callee = unwrapExpression(expression.callee);
  if (callee?.type !== "MemberExpression") return false;

  return isIdentifier(callee.object, "Schema");
};

const noInlineSchemaCompile = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Effect Schema compiler calls inside function bodies; hoist compiled decoders and encoders to module scope.",
    },
  },
  create(context) {
    let functionDepth = 0;

    const enterFunction = () => {
      functionDepth++;
    };
    const exitFunction = () => {
      functionDepth--;
    };

    return {
      FunctionDeclaration: enterFunction,
      "FunctionDeclaration:exit": exitFunction,
      FunctionExpression: enterFunction,
      "FunctionExpression:exit": exitFunction,
      ArrowFunctionExpression: enterFunction,
      "ArrowFunctionExpression:exit": exitFunction,
      CallExpression(node) {
        if (functionDepth === 0) return;

        const method = getSchemaCompilerMethod(node.callee);
        if (method === undefined) return;

        const highCost = isNestedSchemaCall(node.arguments?.[0]);
        const message = highCost
          ? `Hoist Schema.${method}(...) to module scope: both the inline schema literal and the compiled function are rebuilt on every call.`
          : `Hoist Schema.${method}(...) to module scope: the compiled function is rebuilt on every call.`;

        context.report({ node: node.callee, message });
      },
    };
  },
};

const collectPackageRoots = () => {
  const roots = [];

  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules") continue;

      const packageRoot = path.join(directory, entry.name);
      const packageJsonPath = path.join(packageRoot, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const json = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        if (typeof json.name === "string") {
          roots.push({ root: path.normalize(packageRoot), name: json.name });
        }
        continue;
      }

      visit(packageRoot);
    }
  };

  for (const workspaceRoot of ["apps", "packages"]) {
    visit(path.join(REPO_ROOT, workspaceRoot));
  }

  return roots.sort((left, right) => right.root.length - left.root.length);
};

const packageRoots = collectPackageRoots();

const findPackageRoot = (absolutePath) => {
  const normalized = path.normalize(absolutePath);
  return packageRoots.find(
    (pkg) => normalized === pkg.root || normalized.startsWith(`${pkg.root}${path.sep}`),
  );
};

const noCrossPackageRelativeImports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow relative imports across workspace package boundaries.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const specifier = node.source?.value;
        if (typeof specifier !== "string" || !specifier.startsWith(".")) return;

        const sourcePackage = findPackageRoot(path.resolve(context.filename));
        if (sourcePackage === undefined) return;

        const resolved = path.resolve(path.dirname(context.filename), specifier);
        const targetPackage = findPackageRoot(resolved);
        if (targetPackage === undefined || targetPackage.root === sourcePackage.root) return;

        context.report({
          node: node.source,
          message: `Import ${targetPackage.name} via its package export instead of a relative path.`,
        });
      },
    };
  },
};

const noEffectEscapeHatch = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect die/orDie escape hatches outside test code.",
    },
  },
  create(context) {
    if (isTestLike(context.filename)) return {};

    const escapeHatches = new Set(["die", "dieMessage", "orDie", "orDieWith"]);

    return {
      MemberExpression(node) {
        if (!escapeHatches.has(getPropertyName(node.property))) return;

        context.report({
          node,
          message:
            "Do not collapse Effect failures with die/orDie escape hatches. Keep typed errors in the Effect error channel.",
        });
      },
    };
  },
};

const noManualTagCheck = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow manual _tag checks.",
    },
  },
  create(context) {
    const isTagProperty = (node) => isIdentifier(node, "_tag") || isStringLiteral(node, "_tag");
    const isTagAccess = (node) => node?.type === "MemberExpression" && isTagProperty(node.property);
    const message =
      "Do not inspect _tag manually. Use Effect.catchTag/catchTags for error handling or Predicate.isTagged for guards.";

    return {
      BinaryExpression(node) {
        if (node.operator === "in" && isTagProperty(node.left)) {
          context.report({ node, message });
          return;
        }

        if (!["===", "!==", "==", "!="].includes(node.operator)) return;
        if (isTagAccess(node.left) || isTagAccess(node.right)) {
          context.report({ node, message });
        }
      },
      MemberExpression(node) {
        if (isTagProperty(node.property)) {
          context.report({ node, message });
        }
      },
    };
  },
};

const noMatchOrElse = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Match.orElse fallbacks; use exhaustive matchers.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (
          callee?.type !== "MemberExpression" ||
          !isIdentifier(callee.object, "Match") ||
          !isIdentifier(callee.property, "orElse")
        ) {
          return;
        }

        context.report({
          node,
          message:
            "Do not use Match.orElse as a catch-all fallback. End the Match chain with Match.exhaustive, Match.option, or Match.orElseAbsurd.",
        });
      },
    };
  },
};

const noTsNocheck = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow TypeScript nocheck directives.",
    },
  },
  create(context) {
    const directiveName = `@ts-${"nocheck"}`;
    const directivePattern = new RegExp(`@ts-${"nocheck"}\\b`, "u");

    return {
      Program(node) {
        const source = fs.readFileSync(context.filename, "utf8");
        if (!directivePattern.test(source)) return;

        context.report({
          node,
          message: `Do not use ${directiveName}; fix the types or narrow the file scope.`,
        });
      },
    };
  },
};

export default {
  meta: {
    name: "ride-lens",
  },
  rules: {
    "no-cross-package-relative-imports": noCrossPackageRelativeImports,
    "no-effect-escape-hatch": noEffectEscapeHatch,
    "no-inline-schema-compile": noInlineSchemaCompile,
    "no-manual-tag-check": noManualTagCheck,
    "no-match-orelse": noMatchOrElse,
    "no-ts-nocheck": noTsNocheck,
  },
};
