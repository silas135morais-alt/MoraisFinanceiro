-- A mesma data pode conter mais de um turno ou recebimento da 99.
-- O índice não único criado na migração original continua suportando a consulta mensal.
DROP INDEX IF EXISTS "DriverDailyEarning_userId_date_key";
