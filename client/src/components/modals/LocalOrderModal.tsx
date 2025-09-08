import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import LocalOrderForm from '@/features/orders/local/LocalOrderForm';

interface LocalOrderModalProps {
  show: boolean;
  handleClose: () => void;
  handleSubmit: (data: any) => void;
  initialData?: any;
  title?: string;
}

const LocalOrderModal: React.FC<LocalOrderModalProps> = ({
  show,
  handleClose,
  handleSubmit,
  initialData,
  title = 'Orden Local'
}) => {
  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-primary">{title}</Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="pt-0">
        <div className="border rounded-3 p-4 bg-light">
          <LocalOrderForm 
            onSubmit={handleSubmit} 
            initialData={initialData}
            onCancel={handleClose}
          />
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default LocalOrderModal;