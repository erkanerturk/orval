import { ReferenceObject, SchemaObject } from 'openapi3-ts';
import { ContextSpecs } from '../../types';
import { ResolverValue } from '../../types/resolvers';
import { asyncReduce } from '../../utils/async-reduce';
import { pascal } from '../../utils/case';
import { isBoolean, isReference } from '../../utils/is';
import { resolveObject } from '../resolvers/object';
import { resolveValue } from '../resolvers/value';
import { combineSchemas } from './combine';
import { getKey } from './keys';
import { getRefInfo } from './ref';

/**
 * Return the output type from an object
 *
 * @param item item with type === "object"
 */
export const getObject = async ({
  item,
  name,
  context,
}: {
  item: SchemaObject;
  name?: string;
  context: ContextSpecs;
}): Promise<ResolverValue> => {
  if (isReference(item)) {
    const { name, specKey } = await getRefInfo(item.$ref, context);
    return {
      value: name,
      imports: [{ name, specKey }],
      schemas: [],
      isEnum: false,
      type: 'object',
    };
  }

  if (item.allOf) {
    return combineSchemas({
      items: item.allOf,
      name,
      separator: 'allOf',
      context,
    });
  }

  if (item.oneOf) {
    return combineSchemas({
      items: item.oneOf,
      name,
      separator: 'oneOf',
      context,
    });
  }

  if (item.anyOf) {
    return combineSchemas({
      items: item.anyOf,
      name,
      separator: 'anyOf',
      context,
    });
  }

  if (item.properties && Object.entries(item.properties).length>0) {
    return asyncReduce(
      Object.entries(item.properties),
      async (
        acc,
        [key, schema]: [string, ReferenceObject | SchemaObject],
        index,
        arr,
      ) => {
        const isRequired = (item.required || []).includes(key);
        const propName = name ? name + pascal(key) : undefined;
        const resolvedValue = await resolveObject({
          schema,
          propName,
          context,
        });
        const isReadOnly = item.readOnly || (schema as SchemaObject).readOnly;
        if (!index) {
          acc.value += '{';
        }
        acc.imports = [...acc.imports, ...resolvedValue.imports];
        acc.value += `\n  ${isReadOnly ? 'readonly ' : ''}${getKey(key)}${
          isRequired ? '' : '?'
        }: ${resolvedValue.value};`;
        acc.schemas = [...acc.schemas, ...resolvedValue.schemas];

        if (arr.length - 1 === index) {
          acc.value += '\n}';
        }

        return acc;
      },
      {
        imports: [],
        schemas: [],
        value: '',
        isEnum: false,
        type: 'object',
      } as ResolverValue,
    );
  }

  if (item.additionalProperties) {
    if (isBoolean(item.additionalProperties)) {
      return {
        value: `{[key: string]: object}`,
        imports: [],
        schemas: [],
        isEnum: false,
        type: 'object',
      };
    }
    const resolvedValue = await resolveValue({
      schema: item.additionalProperties,
      name,
      context,
    });
    return {
      value: `{[key: string]: ${resolvedValue.value}}`,
      imports: resolvedValue.imports || [],
      schemas: resolvedValue.schemas || [],
      isEnum: false,
      type: 'object',
    };
  }

  return {
    value: item.type === 'object' ? '{}' : 'unknown',
    imports: [],
    schemas: [],
    isEnum: false,
    type: 'object',
  };
};
