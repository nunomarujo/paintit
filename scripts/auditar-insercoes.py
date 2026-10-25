import re, json, pathlib

obrig = {
 "acc_entries":"data,descricao,origem,origem_id","acc_lines":"conta,entry_id",
 "avaliador_bonus_credits":"invite_id,org_id","bank_imports":"duplicadas,ficheiro,formato,linhas,novas",
 "bank_lines":"chave,data,descricao,import_id,valor_cents","blocked_users":"motivo,user_id",
 "buildings":"codigo_postal,concelho,localidade,morada,nome_interno,org_id,tipo",
 "consumable_moves":"consumable_id,org_id,quantidade","contact_violations":"motivos,onde,texto,user_id",
 "engagement_events":"engagement_id,kind",
 "fiscal_documents":"cliente_nome,data,origin_id,origin_type,reason,tipo,total_cents",
 "listing_invites":"painter_org_id,request_id","listing_reports":"motivo,request_id",
 "material_orders":"embalagens,engagement_id,painter_org_id,product_id,supplier_org_id",
 "notifications":"link,org_id,texto","org_consumables":"nome,org_id",
 "org_documents":"kind,nome_ficheiro,org_id,storage_path","org_invitations":"email,org_id,role",
 "org_members":"org_id,role,user_id","org_price_book":"categoria,chave,descricao,org_id,preco_unitario,unidade",
 "org_subscriptions":"org_id,periodicidade,plano,preco_cents,preco_versao","organizations":"kind,nome",
 "painter_quote_lines":"categoria,descricao,org_id,quote_id","painter_quotes":"cliente_nome,numero,org_id",
 "painter_tender_prefs":"org_id","painter_terms_acceptances":"painter_org_id,version",
 "products":"marca,nome,org_id,tipo","promo_codes":"code,discount_bps",
 "proposal_lines":"categoria,descricao,preco_unitario_cents,proposal_id,quantidade",
 "proposal_messages":"lado,proposal_id,request_id,texto","proposals":"painter_org_id,request_id",
 "public_tenders":"distrito,entidade,objeto,prazo_entrega,referencia",
 "reference_products":"marca,nome,tipo","referral_codes":"code,supplier_org_id",
 "request_invites":"code,request_id","request_photos":"kind,request_id,storage_path",
 "request_surfaces":"kind,request_id","request_surveys":"request_id",
 "reviews":"comunicacao,engagement_id,painter_org_id,prazo,qualidade",
 "strike_appeals":"texto,user_id,violation_id","stripe_bt_review":"bt_id,nota",
 "stripe_payments":"amount_cents,engagement_id,kind,payment_intent",
 "supplier_customers":"org_id,painter_org_id","supplier_delivery":"org_id",
 "supplier_discounts":"desconto_bps,org_id",
 "supplier_painter_invites":"email,morada,nome,org_id,referral_code_id,telefone",
 "supplier_payout_details":"iban,org_id,titular","supplier_referral_invites":"code,painter_org_id",
 "supplier_reviews":"atendimento,entrega,painter_org_id,produto,supplier_org_id",
 "supplier_subscriptions":"org_id,plan,price_cents","supplier_survey_coverage":"org_id",
 "survey_clarification_items":"clarification_id,painter_user_id,texto",
 "survey_info_reviews":"nota,painter_user_id,request_survey_id",
 "survey_reviews":"nota,request_survey_id,vendedor_user_id","survey_terms_acceptances":"user_id,version",
 "work_requests":"building_id,org_id,tipo_obra,titulo","work_templates":"nome,org_id",
 "worksite_addenda":"descricao,painter_org_id,valor_cents,worksite_id",
 "worksite_entries":"painter_org_id,tipo,worksite_id","worksite_members":"funcao,nome,painter_org_id,worksite_id",
 "worksite_phases":"nome,painter_org_id,worksite_id","worksite_photos":"fase,org_id,storage_path,worksite_id",
 "worksites":"nome,org_id",
}
# Colunas postas por trigger BEFORE INSERT: o código pode omiti-las sem problema.
por_trigger = {
 "worksite_addenda":{"painter_org_id"},"worksite_entries":{"painter_org_id"},
 "worksite_members":{"painter_org_id"},"worksite_phases":{"painter_org_id"},
 "worksite_photos":{"org_id"},"painter_quote_lines":{"org_id"},"painter_quotes":{"numero"},
 "material_orders":{"painter_org_id"},
}
achados=[]
for f in pathlib.Path('src').rglob('*.ts*'):
    texto=f.read_text()
    for m in re.finditer(r"\.from\(\s*'([a-z_]+)'\s*\)\s*\.(?:insert|upsert)\(\s*(\{|\[)", texto):
        tabela=m.group(1)
        if tabela not in obrig: continue
        # Apanhar o objecto literal a seguir, equilibrando chavetas.
        i=m.end()-1; prof=0; j=i
        while j < len(texto):
            if texto[j] in '{[': prof+=1
            elif texto[j] in '}]':
                prof-=1
                if prof==0: break
            j+=1
        corpo=texto[i:j+1]
        if '...' in corpo or 'map(' in corpo and m.group(2)=='(':
            continue
        # Propriedades normais (nome: valor) e abreviadas (nome, / nome })
        chaves=set(re.findall(r"(?:^|[{,\s])([a-z_][a-z_0-9]*)\s*:", corpo))
        chaves|=set(re.findall(r"(?:^|[{,])\s*([a-z_][a-z_0-9]*)\s*(?=[,}])", corpo))
        faltam=set(obrig[tabela].split(','))-chaves-por_trigger.get(tabela,set())
        if faltam:
            linha=texto[:m.start()].count('\n')+1
            achados.append((str(f),linha,tabela,sorted(faltam)))
for a in achados: print(f"{a[0]}:{a[1]}  {a[2]}  falta: {', '.join(a[3])}")
print(f"\n{len(achados)} inserções a verificar")
