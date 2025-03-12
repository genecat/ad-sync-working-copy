import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React from 'react';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipPrimitive.TooltipContentProps
>(({ className, side = 'top', ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    side={side}
    className={cn(
      'z-50 rounded-md border bg-card p-2 text-sm shadow-md',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
