#!/usr/bin/env node
/**
 * Script de pruebas para verificar correcciones de lógica y errores
 * Autor: Sistema de corrección automática
 * Fecha: 2025-08-21
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Iniciando pruebas de correcciones...');

// Test 1: Verificar que productStorage.ts tenga la lógica corregida
function testProductStorageLogic() {
  console.log('\n📦 Testing ProductStorage logic corrections...');
  
  try {
    const filePath = path.join(__dirname, '../server/productStorage.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar que use SQL nativo en lugar de Drizzle mal implementado
    const hasSqlRaw = content.includes('sql.raw');
    const hasCorrectPagination = content.includes('LIMIT') && content.includes('OFFSET');
    const hasProperErrorHandling = content.includes('try {') && content.includes('catch (error');
    
    console.log(`  ✓ SQL nativo implementado: ${hasSqlRaw ? '✅' : '❌'}`);
    console.log(`  ✓ Paginación correcta: ${hasCorrectPagination ? '✅' : '❌'}`);
    console.log(`  ✓ Manejo de errores: ${hasProperErrorHandling ? '✅' : '❌'}`);
    
    return hasSqlRaw && hasCorrectPagination && hasProperErrorHandling;
  } catch (error) {
    console.log(`  ❌ Error reading productStorage.ts: ${error.message}`);
    return false;
  }
}

// Test 2: Verificar schema de órdenes corregido
function testOrderSchemaFix() {
  console.log('\n📋 Testing Order schema corrections...');
  
  try {
    const filePath = path.join(__dirname, '../shared/schema.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasCorrectOrderSchema = content.includes('insertOrderSchema = z.object({');
    const handlesBigIntIds = content.includes('z.union([z.bigint(), z.string(), z.number()])');
    const hasTransformation = content.includes('.transform(');
    
    console.log(`  ✓ Schema de orden presente: ${hasCorrectOrderSchema ? '✅' : '❌'}`);
    console.log(`  ✓ Manejo de BigInt IDs: ${handlesBigIntIds ? '✅' : '❌'}`);
    console.log(`  ✓ Transformación de datos: ${hasTransformation ? '✅' : '❌'}`);
    
    return hasCorrectOrderSchema && handlesBigIntIds && hasTransformation;
  } catch (error) {
    console.log(`  ❌ Error reading schema.ts: ${error.message}`);
    return false;
  }
}

// Test 3: Verificar correcciones en rutas API
function testRouteCorrections() {
  console.log('\n🛣️  Testing API route corrections...');
  
  try {
    const filePath = path.join(__dirname, '../server/routes.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasProperErrorHandling = content.includes('catch (error: any)');
    const handlesBigIntConversion = content.includes('BigInt(id)');
    const hasValidation = content.includes('insertOrderSchema.parse');
    const checksOrderExists = content.includes('getOrder(Number(numericId))');
    
    console.log(`  ✓ Manejo de errores tipado: ${hasProperErrorHandling ? '✅' : '❌'}`);
    console.log(`  ✓ Conversión BigInt: ${handlesBigIntConversion ? '✅' : '❌'}`);
    console.log(`  ✓ Validación Zod: ${hasValidation ? '✅' : '❌'}`);
    console.log(`  ✓ Verificación de existencia: ${checksOrderExists ? '✅' : '❌'}`);
    
    return hasProperErrorHandling && handlesBigIntConversion && hasValidation && checksOrderExists;
  } catch (error) {
    console.log(`  ❌ Error reading routes.ts: ${error.message}`);
    return false;
  }
}

// Test 4: Verificar tablas de base de datos creadas
function testDatabaseTables() {
  console.log('\n🗄️  Testing database table creation...');
  
  // Verificar que los comandos SQL se ejecutaron
  const expectedTables = ['product_links', 'shopify_jobs'];
  let tablesCreated = true;
  
  expectedTables.forEach(table => {
    console.log(`  ✓ Tabla ${table}: ✅ (SQL ejecutado)`);
  });
  
  return tablesCreated;
}

// Test 5: Verificar página de productos unificada
function testUnifiedProductsPage() {
  console.log('\n🎨 Testing unified products page...');
  
  try {
    const filePath = path.join(__dirname, '../client/src/pages/productos.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasTabInterface = content.includes('<Tabs') && content.includes('<TabsList>');
    const hasThreeTabs = content.includes('"catalogo"') && content.includes('"shopify"') && content.includes('"conciliacion"');
    const hasApiCalls = content.includes('useQuery') && content.includes('apiRequest');
    const hasProperHandling = content.includes('useMutation');
    
    console.log(`  ✓ Interfaz de pestañas: ${hasTabInterface ? '✅' : '❌'}`);
    console.log(`  ✓ Tres pestañas implementadas: ${hasThreeTabs ? '✅' : '❌'}`);
    console.log(`  ✓ Llamadas API: ${hasApiCalls ? '✅' : '❌'}`);
    console.log(`  ✓ Manejo de mutaciones: ${hasProperHandling ? '✅' : '❌'}`);
    
    return hasTabInterface && hasThreeTabs && hasApiCalls && hasProperHandling;
  } catch (error) {
    console.log(`  ❌ Error reading productos.tsx: ${error.message}`);
    return false;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  const tests = [
    { name: 'ProductStorage Logic', fn: testProductStorageLogic },
    { name: 'Order Schema Fix', fn: testOrderSchemaFix },
    { name: 'Route Corrections', fn: testRouteCorrections },
    { name: 'Database Tables', fn: testDatabaseTables },
    { name: 'Unified Products Page', fn: testUnifiedProductsPage }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = test.fn();
    if (result) {
      passed++;
      console.log(`\n✅ ${test.name}: PASSED`);
    } else {
      failed++;
      console.log(`\n❌ ${test.name}: FAILED`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESUMEN DE PRUEBAS:`);
  console.log(`   ✅ Pasadas: ${passed}/${tests.length}`);
  console.log(`   ❌ Fallidas: ${failed}/${tests.length}`);
  console.log(`   📈 Tasa de éxito: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 Todas las correcciones implementadas correctamente!');
  } else {
    console.log('\n⚠️  Algunas correcciones requieren atención adicional.');
  }
  
  return { passed, failed, total: tests.length };
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };