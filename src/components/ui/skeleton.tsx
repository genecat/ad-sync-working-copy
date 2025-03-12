import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={
        "bg-gray-200 animate-pulse " + (className ? className : "")
      }
    />
  );
}
