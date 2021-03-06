/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import doctrine from 'doctrine';

type JsDoc = {
  description: ?string,
  params: Array<{
    name: string,
    description: ?string,
    type: ?{ name: string },
    optional?: boolean,
  }>,
  returns: ?{
    description: ?string,
    type: ?{ name: string },
  },
};

function getType(tagType) {
  if (!tagType) {
    return null;
  }

  const { type, name, expression, elements, applications } = tagType;

  switch (type) {
    case 'NameExpression':
      // {a}
      return { name };
    case 'UnionType':
      // {a|b}
      return {
        name: 'union',
        elements: elements.map(element => getType(element)),
      };
    case 'AllLiteral':
      // {*}
      return { name: 'mixed' };
    case 'TypeApplication':
      // {Array<string>} or {string[]}
      return {
        name: expression.name,
        elements: applications.map(element => getType(element)),
      };
    case 'ArrayType':
      // {[number, string]}
      return {
        name: 'tuple',
        elements: elements.map(element => getType(element)),
      };
    default: {
      const typeName = name ? name : expression ? expression.name : null;
      if (typeName) {
        return { name: typeName };
      } else {
        return null;
      }
    }
  }
}

function getOptional(tag): boolean {
  return !!(tag.type && tag.type.type && tag.type.type === 'OptionalType');
}

// Add jsdoc @return description.
function getReturnsJsDoc(jsDoc) {
  const returnTag = jsDoc.tags.find(
    tag => tag.title === 'return' || tag.title === 'returns',
  );
  if (returnTag) {
    return {
      description: returnTag.description,
      type: getType(returnTag.type),
    };
  }
  return null;
}

// Add jsdoc @param descriptions.
function getParamsJsDoc(jsDoc) {
  if (!jsDoc.tags) {
    return [];
  }
  return jsDoc.tags.filter(tag => tag.title === 'param').map(tag => {
    return {
      name: tag.name,
      description: tag.description,
      type: getType(tag.type),
      optional: getOptional(tag),
    };
  });
}

export default function parseJsDoc(docblock: string): JsDoc {
  const jsDoc = doctrine.parse(docblock);

  return {
    description: jsDoc.description || null,
    params: getParamsJsDoc(jsDoc),
    returns: getReturnsJsDoc(jsDoc),
  };
}
