-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillTagId_fkey" FOREIGN KEY ("skillTagId") REFERENCES "SkillTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
