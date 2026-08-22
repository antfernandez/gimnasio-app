import { BrandMark } from "@/components/brand-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <BrandMark className="mx-auto" />
      <Card>
        <CardHeader>
          <CardTitle>¡Gracias por registrarte!</CardTitle>
          <CardDescription>Confirma tu correo para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Te registraste correctamente. Revisa tu correo y confirma tu
            cuenta antes de iniciar sesión.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
