                </Button>
                <Button variant="outline" onClick={() => handleExport('csv')}><Download className="h-4 w-4 mr-1" />CSV</Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')}>XLSX</Button>
                <Button variant="ghost" onClick={() => downloadCatalogTemplate('csv')}>Plantilla</Button>
              </div>
            </div>

            {/* Badges de filtros activos */}
            <div className="flex flex-wrap gap-2">
              {q && (
                <Badge variant="secondary">Buscar: {q}<button className="ml-2" onClick={() => { setSearchInput(""); setQ(""); }}><X className="h-3 w-3" /></button></Badge>
              )}
              {marca && (<Badge variant="secondary">Marca: {marca}<button className="ml-2" onClick={() => setMarca("") }><X className="h-3 w-3" /></button></Badge>)}
              {categoria && (<Badge variant="secondary">Categoría: {categoria}<button className="ml-2" onClick={() => setCategoria("") }><X className="h-3 w-3" /></button></Badge>)}
              {stockEq0 && (<Badge variant="secondary">Stock=0<button className="ml-2" onClick={() => setStockEq0(false)}><X className="h-3 w-3" /></button></Badge>)}
              {typeof stockGte === 'number' && (<Badge variant="secondary">Stock ≥ {stockGte}<button className="ml-2" onClick={() => setStockGte(undefined)}><X className="h-3 w-3" /></button></Badge>)}
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Productos ({total})</span>
              <div className="text-sm text-muted-foreground">Página {page} de {totalPages}</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sku Externo</TableHead>
                    <TableHead>Sku Interno</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Inventario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="p-6 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="p-6 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
                  ) : items.map((p) => (
                    <TableRow key={`${p.sku || ''}-${p.sku_interno || ''}`}>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell className="font-mono text-sm">{p.sku_interno}</TableCell>
                      <TableCell className="max-w-xs truncate">{p.nombre_producto}</TableCell>
                      <TableCell>${typeof p.costo === 'number' ? p.costo.toFixed(2) : '0.00'}</TableCell>
                      <TableCell><Badge variant={(p.stock ?? 0) > 0 ? 'default' : 'destructive'}>{p.stock ?? 0}</Badge></TableCell>
                      <TableCell>
                        {((p.estado ?? ((p.stock ?? 0) > 0 ? 'ACTIVO' : 'INACTIVO')) === 'ACTIVO') ? (
                          <Badge variant="default">ACTIVO</Badge>
                        ) : (
                          <Badge variant="secondary">INACTIVO</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">Mostrando {items.length === 0 ? 0 : Math.min((page-1)*pageSize + 1, total)} - {Math.min(page*pageSize, total)} de {total}</div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

