import {
  LEGACY_OWNER_USER_ID,
  activities,
  fit_files,
  type RideLensDatabaseService,
} from "@ride-lens/db";
import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";

export class OwnershipClaimError extends Data.TaggedError("OwnershipClaimError")<{
  readonly cause: unknown;
}> {}

const isMigratableOwner = (ownerUserId: string) =>
  ownerUserId === LEGACY_OWNER_USER_ID || ownerUserId.startsWith("user_");

export const claimMigratedOwnership = (
  database: RideLensDatabaseService,
  ownerUserId: string,
): Effect.Effect<void, OwnershipClaimError> =>
  Effect.tryPromise({
    try: () =>
      database.db.transaction(async (tx) => {
        const owners = await tx
          .selectDistinct({ ownerUserId: activities.owner_user_id })
          .from(activities);
        if (owners.some((owner) => owner.ownerUserId === ownerUserId)) return;

        const migratableOwners = owners.filter((owner) => isMigratableOwner(owner.ownerUserId));
        const hasBetterAuthOwner = owners.some((owner) => !isMigratableOwner(owner.ownerUserId));
        if (hasBetterAuthOwner || migratableOwners.length !== 1) return;

        const previousOwnerUserId = migratableOwners[0]?.ownerUserId;
        if (!previousOwnerUserId) return;

        await tx
          .update(fit_files)
          .set({ owner_user_id: ownerUserId })
          .where(eq(fit_files.owner_user_id, previousOwnerUserId));
        await tx
          .update(activities)
          .set({ owner_user_id: ownerUserId })
          .where(eq(activities.owner_user_id, previousOwnerUserId));
      }),
    catch: (cause) => new OwnershipClaimError({ cause }),
  });
