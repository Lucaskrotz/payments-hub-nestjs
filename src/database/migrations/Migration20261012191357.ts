import { Migration } from '@mikro-orm/migrations';

export class Migration20261012191357 extends Migration {

  override name = 'Migration20261012191357';

  override up(): void | Promise<void> {
    this.addSql(`create table "payment" ("id" serial primary key, "event_id" varchar(255) not null, "amount" numeric(12,2) not null, "status" text not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "payment" add constraint "payment_event_id_unique" unique ("event_id");`);
    this.addSql(`alter table "payment" add constraint "payment_status_check" check ("status" in ('PENDING', 'CONFIRMED', 'FAILED'));`);
  }

}
