import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  ChevronRight,
  Compass,
  Database,
  FileText,
  Globe2,
  Landmark,
  Layers,
  LineChart,
  Map,
  MapPin,
  SearchCode,
  ShieldCheck,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import logoAsset from "@/assets/novara-logo.png.asset.json";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { CONTEXT_LINE } from "@/lib/novara/engine";

/**
 * Navegação em dois blocos, por proveniência do dado — nunca misturar página
 * calculada a partir do CSV da Novara com página calculada a partir de
 * pesquisa/API externa. "Fonte interna" reúne tudo que sai do CSV; "Fonte
 * externa" reúne uma sub-aba por critério de decisão do case (mercado,
 * operação, abastecimento, risco, aderência). Adicionar página = acrescentar
 * uma linha aqui.
 */
const GROUPS = [
  {
    key: "interna",
    label: "Fonte interna",
    caption: "o que o CSV da Novara responde",
    icon: Database,
    defaultOpen: true,
    items: [
      { title: "Visão geral", url: "/", icon: LineChart },
      { title: "Financeiro", url: "/financeiro", icon: Wallet },
      { title: "Praças", url: "/pracas", icon: MapPin },
      { title: "Mapa", url: "/mapa", icon: Map },
      { title: "Maturação", url: "/maturacao", icon: Users },
      { title: "Carteira", url: "/carteira", icon: Store },
      { title: "Mix e produto", url: "/mix", icon: Layers },
      { title: "Qualidade do dado", url: "/qualidade", icon: ShieldCheck },
    ],
  },
  {
    key: "externa",
    label: "Fonte externa",
    caption: "o que a base não responde, por critério de decisão",
    icon: Globe2,
    defaultOpen: false,
    items: [
      { title: "Visão geral", url: "/externos", icon: Compass },
      { title: "1. Mercado", url: "/externos/mercado", icon: Building2 },
      { title: "2. Operação", url: "/externos/operacao", icon: Truck },
      { title: "3. Abastecimento", url: "/externos/abastecimento", icon: Store },
      { title: "4. Risco e concorrência", url: "/externos/risco", icon: Landmark },
      { title: "5. Aderência estratégica", url: "/externos/aderencia", icon: ShieldCheck },
    ],
  },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const simuladorAtivo = pathname === "/simulador";
  const metodologiaAtiva = pathname === "/metodologia";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="overflow-hidden rounded-lg">
          <img
            src={logoAsset.url}
            alt="Logo Novara"
            className="h-11 w-full object-cover object-left group-data-[collapsible=icon]:object-center"
          />
        </div>
        <p className="mt-2 truncate text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          planejamento de expansão
        </p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Simulador de mercado" isActive={simuladorAtivo}>
                  <Link to="/simulador">
                    <SearchCode aria-hidden="true" />
                    <span className="font-medium">Simulador de mercado</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Metodologia" isActive={metodologiaAtiva}>
                  <Link to="/metodologia">
                    <BookOpen aria-hidden="true" />
                    <span className="font-medium">Metodologia</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Case completo (PDF)">
                  <a href="/Case_Novara_PortoAlegre_Resumo.pdf" target="_blank" rel="noopener noreferrer">
                    <FileText aria-hidden="true" />
                    <span className="font-medium">Case completo (PDF)</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GROUPS.map((group) => {
          const hasActive = group.items.some((i) => i.url === pathname);
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible
                    defaultOpen={group.defaultOpen || hasActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={group.label} isActive={hasActive}>
                          <group.icon aria-hidden="true" />
                          <span className="font-medium">{group.label}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <p className="px-2 pb-1 pt-1.5 text-[11px] leading-snug text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                          {group.caption}
                        </p>
                        <SidebarMenuSub>
                          {group.items.map((item) => (
                            <SidebarMenuSubItem key={item.url}>
                              <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                                <Link to={item.url}>
                                  <item.icon aria-hidden="true" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <p className="text-xs leading-relaxed text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {CONTEXT_LINE}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
