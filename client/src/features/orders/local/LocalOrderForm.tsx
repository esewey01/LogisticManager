import React, { useState } from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';

interface LocalOrderFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const LocalOrderForm: React.FC<LocalOrderFormProps> = ({
  onSubmit,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState({
    orderNumber: initialData?.orderNumber || '',
    customerName: initialData?.customerName || '',
    customerPhone: initialData?.customerPhone || '',
    customerEmail: initialData?.customerEmail || '',
    deliveryAddress: initialData?.deliveryAddress || '',
    orderDate: initialData?.orderDate || '',
    deliveryDate: initialData?.deliveryDate || '',
    status: initialData?.status || 'pending',
    totalAmount: initialData?.totalAmount || '',
    paymentMethod: initialData?.paymentMethod || 'cash',
    notes: initialData?.notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Form onSubmit={handleSubmit} className="local-order-form">
      {/* Sección de Información del Cliente */}
      <div className="section-card mb-4">
        <h5 className="section-title text-muted mb-3">Información del Cliente</h5>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Nombre del Cliente *</Form.Label>
              <Form.Control
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Ingrese nombre completo"
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Número de Orden</Form.Label>
              <Form.Control
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                placeholder="Ingrese número de orden"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Teléfono</Form.Label>
              <Form.Control
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="Ingrese número de teléfono"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Email</Form.Label>
              <Form.Control
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="Ingrese correo electrónico"
              />
            </Form.Group>
          </Col>
        </Row>
      </div>

      {/* Sección de Fechas y Entrega */}
      <div className="section-card mb-4">
        <h5 className="section-title text-muted mb-3">Fechas y Entrega</h5>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Fecha de Orden *</Form.Label>
              <Form.Control
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Fecha de Entrega</Form.Label>
              <Form.Control
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Dirección de Entrega</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                placeholder="Ingrese dirección completa"
              />
            </Form.Group>
          </Col>
        </Row>
      </div>

      {/* Sección de Detalles de Pago */}
      <div className="section-card mb-4">
        <h5 className="section-title text-muted mb-3">Detalles de Pago</h5>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Método de Pago</Form.Label>
              <Form.Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Monto Total ($)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                name="totalAmount"
                value={formData.totalAmount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Estado</Form.Label>
              <Form.Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </div>

      {/* Sección de Notas */}
      <div className="section-card mb-4">
        <h5 className="section-title text-muted mb-3">Notas Adicionales</h5>
        <Form.Group className="mb-3">
          <Form.Control
            as="textarea"
            rows={3}
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ingrese cualquier nota o instrucción especial..."
          />
        </Form.Group>
      </div>

      {/* Botones de Acción */}
      <div className="d-flex gap-2 justify-content-end mt-4">
        <Button 
          variant="outline-secondary" 
          onClick={onCancel}
          className="px-4"
        >
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          type="submit"
          className="px-4"
        >
          Guardar Orden
        </Button>
      </div>
    </Form>
  );
};

export default LocalOrderForm;