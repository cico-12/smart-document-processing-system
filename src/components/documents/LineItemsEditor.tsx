"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LineItem } from "@/types/document";

type LineItemsEditorProps = {
  lineItems: LineItem[];
  onChange: (items: LineItem[]) => void;
};

export function LineItemsEditor({ lineItems, onChange }: LineItemsEditorProps) {
  const updateItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const nextItems = lineItems.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      return {
        ...item,
        [field]: value,
      };
    });

    onChange(nextItems);
  };

  const addItem = () => {
    onChange([
      ...lineItems,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(lineItems.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="mt-4 space-y-4">
      {lineItems.length ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 font-medium">Unit Price</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-3">
                    <Input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, "quantity", Number(event.target.value))
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(index, "unitPrice", Number(event.target.value))
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(event) =>
                        updateItem(index, "amount", Number(event.target.value))
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          No line items detected. You can add them manually.
        </p>
      )}

      <Button type="button" variant="secondary" onClick={addItem}>
        Add line item
      </Button>
    </div>
  );
}