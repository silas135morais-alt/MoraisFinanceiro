import { handleApiError, ok } from "@/lib/api-response";

import { requireUserId } from "@/lib/auth-guard";

import { prisma } from "@/lib/prisma";



type Params = { params: Promise<{ id: string }> };



/**

 * Remove somente transações cujo registro de origem já não existe.

 * Isso evita que a rota seja usada para apagar lançamentos financeiros válidos.

 */

export async function DELETE(_: Request, context: Params) {
  
  try {
    
    const { id } = await context.params;
    
    const userId = await requireUserId();
    
    const transaction = await prisma.transaction.findFirst({
      
      where: { id, userId },
      
      select: { id: true, sourceId: true, sourceType: true },
      
    });
    

    
    if (!transaction) {
      
      return new Response(JSON.stringify({ error: "Transação não encontrada." }), {
        
        status: 404,
        
        headers: { "Content-Type": "application/json" },
        
      });
      
    }
    

    
    let sourceExists = false;
    
    if (transaction.sourceType === "Income" && transaction.sourceId) {
      
      sourceExists = Boolean(await prisma.income.findFirst({ where: { id: transaction.sourceId, userId }, select: { id: true } }));
      
    }
    
    if (transaction.sourceType === "Expense" && transaction.sourceId) {
      
      sourceExists = Boolean(await prisma.expense.findFirst({ where: { id: transaction.sourceId, userId }, select: { id: true } }));
      
    }
    
    if (transaction.sourceType === "CreditCardPurchase" && transaction.sourceId) {
      
      sourceExists = Boolean(await prisma.creditCardPurchase.findFirst({ where: { id: transaction.sourceId, userId }, select: { id: true } }));
      
    }
    
    if (transaction.sourceType === "InvestmentContribution" && transaction.sourceId) {
      
      sourceExists = Boolean(await prisma.investmentContribution.findFirst({ where: { id: transaction.sourceId, userId }, select: { id: true } }));
      
    }
    

    
    if (sourceExists) {
      
      return new Response(JSON.stringify({ error: "A transação possui um registro de origem válido." }), {
        
        status: 409,
        
        headers: { "Content-Type": "application/json" },
        
      });
      
    }
    

    
    return ok(await prisma.transaction.delete({ where: { id, userId } }));
    
  } catch (error) {
    
    return handleApiError(error);
    
  }
  
}










































