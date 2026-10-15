export default function MoneyInput({ value, onChange, label }) {
  
  // Criamos a função aqui dentro para o componente saber o que fazer
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const handleChange = (e) => {
    // Remove tudo que não é dígito
    let val = e.target.value.replace(/\D/g, "");
    // Transforma em centavos
    const numericValue = Number(val) / 100;
    onChange(numericValue);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        className="border rounded-md p-2 bg-white"
        value={formatCurrency(value)}
        onChange={handleChange}
        placeholder="R$ 0,00"
      />
    </div>
  );
}