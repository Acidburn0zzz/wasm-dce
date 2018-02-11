const {traverse, parsers, printers} = require("webassembly-interpreter/lib/tools");
const libwabt = require('./libwabt');

const emptyFunc = {
  type: 'Func',
  params: [],
  result: [],
  body: [],
  name: null,
};

function debug(msg) {
  console.log(msg);
}

function removeFuncAndExport(moduleExport, ast) {
  const exportName = moduleExport.name;

  // TODO(sven): test if we actually want to delete a func
  const funcName = moduleExport.descr.id.value;

  debug(`Remove unused "${exportName}"`);

  traverse(ast, {
    Func(path) {

      if (path.node.name.value === funcName) {
        Object.assign(path.node, emptyFunc);
        debug('\t> remove func');
      }
    },

    ModuleExport(path) {
      if (path.node.name === exportName) {
        // FIXME(sven): here's a hack to hide the node, since this type is not
        // printable
        path.node.type = 'deleted';
        debug('\t> remove export');
      }
    },
  });
}

function getUnusedModuleExports(ast) {
  const usedModuleExports = [];

  traverse(ast, {

    ModuleExport({node}) {
      if (usedExports.indexOf(node.name) === -1) {
        usedModuleExports.push(node);
      }
    },

  });

  return usedModuleExports;
}


module.exports = function (buff, usedExports, cb) {

  parsers.parseWASM(buff, (ast) => {
    // Before
    // console.log(printers.printWAST(ast));

    getUnusedModuleExports(ast)
      .forEach(e => removeFuncAndExport(e, ast));

    const wast = printers.printWAST(ast);

    // To wasm
    const m = libwabt.parseWat('out.wast', wast);
    m.resolveNames();
    m.validate();

    const {buffer} = m.toBinary({log: true, write_debug_names:true});

    // After
    // console.log(printers.printWAST(ast));

    cb(buffer);
  });

};
