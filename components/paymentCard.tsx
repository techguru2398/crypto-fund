import { FaCcVisa, FaCcMastercard, FaCcAmex } from 'react-icons/fa';

type CardProps = {
    card: {
      id: string;
      brand: string;
      exp_month: number;
      exp_year: number;
      last4: string;
    };
    onRemove: (paymentMethodId: string) => void;
  };

const CardIcon = ({ brand }: { brand: string }) => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return <FaCcVisa className="text-blue-600 text-2xl" />;
    case 'mastercard':
      return <FaCcMastercard className="text-red-600 text-2xl" />;
    case 'amex':
      return <FaCcAmex className="text-indigo-600 text-2xl" />;
    default:
      return <div className="w-6 h-6 bg-gray-300 rounded" />;
  }
};

export default function PaymentCard({ card, onRemove }: CardProps) {
  const expiry = `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
            <CardIcon brand={card.brand} />
            <div>
            <div className="font-medium">**** **** **** {card.last4}</div>
            <div className="text-sm text-muted-foreground">Expires {expiry}</div>
            </div>
        </div>
        <button 
            onClick={() => onRemove(card.id)} 
            className="text-sm text-red-500 hover:underline"
        > 
            Remove
        </button>
    </div>
  );
}
