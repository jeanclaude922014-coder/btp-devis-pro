"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FloorSpec, RoomType } from "@/lib/floor-plan/types";

/** Hauteur sous plafond adaptée au climat tropical (bonne ventilation naturelle). */
const WALL_HEIGHT_M = 2.8;
const SLAB_THICKNESS_M = 0.2;
const WALL_THICKNESS_M = 0.15;

const ROOM_COLORS: Record<RoomType, number> = {
  salon: 0xdbeafe,
  cuisine: 0xfef3c7,
  salle_a_manger: 0xe0e7ff,
  chambre: 0xdcfce7,
  sdb: 0xcffafe,
  wc: 0xe2e8f0,
  garage: 0xd6d3d1,
  terrasse: 0xfde68a,
  bureau: 0xfae8ff,
  circulation: 0xf1f5f9,
};

export function PlanViewer3D({ floors }: { floors: FloorSpec[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || floors.length === 0) return undefined;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const maxWidthM = Math.max(...floors.map((f) => f.widthM));
    const maxDepthM = Math.max(...floors.map((f) => f.depthM));
    const totalHeightM = floors.length * (WALL_HEIGHT_M + SLAB_THICKNESS_M);
    const farPlane = Math.sqrt(maxWidthM ** 2 + maxDepthM ** 2) * 4 + totalHeightM * 10;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, farPlane);
    // Vue en perspective 3/4 (toit + façades visibles), plutôt qu'une vue quasi verticale.
    const boundingRadius = Math.sqrt(maxWidthM ** 2 + maxDepthM ** 2 + totalHeightM ** 2);
    const elevation = THREE.MathUtils.degToRad(30);
    const azimuth = THREE.MathUtils.degToRad(35);
    camera.position.set(
      maxWidthM / 2 + boundingRadius * Math.cos(elevation) * Math.sin(azimuth),
      totalHeightM / 2 + boundingRadius * Math.sin(elevation),
      maxDepthM / 2 + boundingRadius * Math.cos(elevation) * Math.cos(azimuth)
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(maxWidthM / 2, totalHeightM / 3, maxDepthM / 2);
    controls.enableDamping = true;
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(maxWidthM, totalHeightM * 3 + 5, maxDepthM * 2);
    scene.add(sun);

    const buildingGroup = new THREE.Group();

    floors.forEach((floor, level) => {
      const baseY = level * (WALL_HEIGHT_M + SLAB_THICKNESS_M);

      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(floor.widthM, SLAB_THICKNESS_M, floor.depthM),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
      );
      slab.position.set(floor.widthM / 2, baseY + SLAB_THICKNESS_M / 2, floor.depthM / 2);
      buildingGroup.add(slab);

      const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
      const wallY = baseY + SLAB_THICKNESS_M + WALL_HEIGHT_M / 2;

      floor.rooms.forEach((room) => {
        const roomFloor = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(room.width - 0.02, 0.1), 0.02, Math.max(room.height - 0.02, 0.1)),
          new THREE.MeshStandardMaterial({ color: ROOM_COLORS[room.type] })
        );
        roomFloor.position.set(
          room.x + room.width / 2,
          baseY + SLAB_THICKNESS_M + 0.011,
          room.y + room.height / 2
        );
        buildingGroup.add(roomFloor);

        const topWall = new THREE.Mesh(
          new THREE.BoxGeometry(room.width, WALL_HEIGHT_M, WALL_THICKNESS_M),
          wallMaterial
        );
        topWall.position.set(room.x + room.width / 2, wallY, room.y);
        buildingGroup.add(topWall);

        const bottomWall = topWall.clone();
        bottomWall.position.z = room.y + room.height;
        buildingGroup.add(bottomWall);

        const leftWall = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_THICKNESS_M, WALL_HEIGHT_M, room.height),
          wallMaterial
        );
        leftWall.position.set(room.x, wallY, room.y + room.height / 2);
        buildingGroup.add(leftWall);

        const rightWall = leftWall.clone();
        rightWall.position.x = room.x + room.width;
        buildingGroup.add(rightWall);
      });

      if (level === floors.length - 1) {
        const roofY = baseY + SLAB_THICKNESS_M + WALL_HEIGHT_M + 0.15;
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(floor.widthM + 1, 0.3, floor.depthM + 1),
          new THREE.MeshStandardMaterial({ color: 0xb45309 })
        );
        roof.position.set(floor.widthM / 2, roofY, floor.depthM / 2);
        buildingGroup.add(roof);
      }
    });

    scene.add(buildingGroup);

    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [floors]);

  if (floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
        La vue 3D apparaîtra ici une fois le plan généré.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
