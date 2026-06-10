import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import {
    computeIntensityRange,
    estimateBrainIsoLevel,
    fetchNiftiVolume,
    maskHasLabel,
    sampleVoxel,
    volumeHasTumorMask,
} from "./niftiVolume";
import { SEGMENTATION_LABELS } from "./segmentationLabels";
import { BRAIN_SHELL } from "./brainShellStyle";

const MARCHING_RESOLUTION = 54;
const MAX_POLYGONS = 180_000;
const TARGET_MODEL_SIZE = 100;

function fillMarchingField(marchingCubes, volume, sampleValue) {
    const size = marchingCubes.size;
    const resolution = marchingCubes.resolution;
    const field = marchingCubes.field;

    for (let k = 0; k < size; k++) {
        for (let j = 0; j < size; j++) {
            for (let i = 0; i < size; i++) {
                const idx = i + j * size + k * size * size;
                const x = (i / resolution) * (volume.cols - 1);
                const y = (j / resolution) * (volume.rows - 1);
                const z = (k / resolution) * (volume.slices - 1);
                field[idx] = sampleValue(x, y, z);
            }
        }
    }
}

function buildMarchingMesh(volume, options) {
    const {
        sampleValue,
        isolation,
        color,
        emissive = null,
        emissiveIntensity = null,
        opacity = 1,
        transparent = false,
        depthWrite = true,
        renderOrder = 0,
    } = options;

    const material = new THREE.MeshStandardMaterial({
        color,
        emissive: emissive ?? color,
        emissiveIntensity:
            emissiveIntensity ?? (emissive ? 0.35 : 0.05),
        roughness: 0.72,
        metalness: 0.04,
        transparent,
        opacity,
        depthWrite,
        side: THREE.DoubleSide,
    });

    const marchingCubes = new MarchingCubes(
        MARCHING_RESOLUTION,
        material,
        false,
        false,
        MAX_POLYGONS,
    );

    fillMarchingField(marchingCubes, volume, sampleValue);
    marchingCubes.isolation = isolation;
    marchingCubes.update();

    if (marchingCubes.count === 0) {
        material.dispose();
        return null;
    }

    const maxDim = Math.max(volume.cols, volume.rows, volume.slices, 1);
    marchingCubes.scale.set(
        volume.cols / maxDim,
        volume.rows / maxDim,
        volume.slices / maxDim,
    );

    marchingCubes.renderOrder = renderOrder;
    marchingCubes.position.set(0, 0, 0);
    return marchingCubes;
}

function fitGroupToCamera(group, camera, controls) {
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) {
        return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 1e-6);

    group.position.copy(center).multiplyScalar(-1);

    const fitScale = TARGET_MODEL_SIZE / maxSize;
    group.scale.setScalar(fitScale);

    const distance = TARGET_MODEL_SIZE * 2.4;
    camera.position.set(distance * 0.18, distance * 0.14, distance);
    camera.near = 0.1;
    camera.far = distance * 12;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.minDistance = TARGET_MODEL_SIZE * 0.06;
    controls.maxDistance = TARGET_MODEL_SIZE * 8;
    controls.update();
}

function disposeObject(object) {
    object.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

export default function TumorVolumeViewer({ mriUrl, maskUrl, onStatusChange }) {
    const containerRef = useRef(null);
    const onStatusChangeRef = useRef(onStatusChange);
    onStatusChangeRef.current = onStatusChange;

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !mriUrl || !maskUrl) return undefined;

        let disposed = false;
        let animationId = 0;
        let renderer;
        let controls;
        const sceneObjects = [];

        const reportStatus = (message) => {
            if (!disposed) {
                onStatusChangeRef.current?.(message);
            }
        };

        async function init() {
            reportStatus("Loading T1ce volume…");

            const mriVolume = await fetchNiftiVolume(mriUrl);
            if (disposed) return;

            reportStatus("Loading segmentation mask…");
            const maskVolume = await fetchNiftiVolume(maskUrl);
            if (disposed) return;

            reportStatus("Building 3D model…");
            await new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(resolve));
            });
            if (disposed) return;

            const { min, max } = computeIntensityRange(mriVolume);
            const brainIso = estimateBrainIsoLevel(mriVolume);
            const hasTumor = volumeHasTumorMask(maskVolume);

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xe8e0f4);

            const width = container.clientWidth || 800;
            const height = container.clientHeight || 520;

            const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 5000);
            camera.position.set(0, 0, 200);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(width, height);
            renderer.sortObjects = true;
            container.replaceChildren(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.minDistance = 20;
            controls.maxDistance = 800;
            controls.target.set(0, 0, 0);

            scene.add(new THREE.AmbientLight(0xffffff, 0.55));
            const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
            keyLight.position.set(80, 120, 100);
            scene.add(keyLight);
            const fillLight = new THREE.DirectionalLight(0xd8d0ff, 0.45);
            fillLight.position.set(-90, -40, -80);
            scene.add(fillLight);

            const group = new THREE.Group();
            scene.add(group);

            const brainMesh = buildMarchingMesh(mriVolume, {
                sampleValue: (x, y, z) => {
                    const value = sampleVoxel(mriVolume, x, y, z);
                    return (value - min) / (max - min);
                },
                isolation: brainIso,
                color: BRAIN_SHELL.color,
                emissive: BRAIN_SHELL.emissive,
                emissiveIntensity: BRAIN_SHELL.emissiveIntensity,
                opacity: BRAIN_SHELL.opacity,
                transparent: true,
                depthWrite: false,
                renderOrder: 0,
            });
            if (brainMesh) {
                group.add(brainMesh);
                sceneObjects.push(brainMesh);
            }

            if (hasTumor) {
                for (const label of SEGMENTATION_LABELS) {
                    if (!maskHasLabel(maskVolume, label.id)) {
                        continue;
                    }

                    const labelMesh = buildMarchingMesh(maskVolume, {
                        sampleValue: (x, y, z) =>
                            (sampleVoxel(maskVolume, x, y, z) | 0) === label.id
                                ? 1
                                : 0,
                        isolation: 0.45,
                        color: label.color,
                        emissive: label.emissive,
                        opacity: label.opacity,
                        transparent: label.transparent,
                        depthWrite: !label.transparent,
                        renderOrder: label.renderOrder,
                    });

                    if (labelMesh) {
                        group.add(labelMesh);
                        sceneObjects.push(labelMesh);
                    }
                }
            }

            fitGroupToCamera(group, camera, controls);

            const animate = () => {
                animationId = requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();

            reportStatus(
                hasTumor
                    ? "Drag to rotate · scroll to zoom inside tumor regions"
                    : "No tumor voxels in mask · brain only",
            );

            const handleResize = () => {
                const nextWidth = container.clientWidth || width;
                const nextHeight = container.clientHeight || height;
                camera.aspect = nextWidth / nextHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(nextWidth, nextHeight);
            };

            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container);

            return () => {
                resizeObserver.disconnect();
            };
        }

        let cleanupResize;
        init()
            .then((cleanup) => {
                cleanupResize = cleanup;
            })
            .catch((error) => {
                if (!disposed) {
                    onStatusChangeRef.current?.(
                        error?.message || "Failed to build 3D visualization.",
                    );
                }
            });

        return () => {
            disposed = true;
            cancelAnimationFrame(animationId);
            controls?.dispose();
            sceneObjects.forEach(disposeObject);
            renderer?.dispose();
            if (container) {
                container.replaceChildren();
            }
            cleanupResize?.();
        };
    }, [maskUrl, mriUrl]);

    return (
        <div
            ref={containerRef}
            className="h-[min(70vh,640px)] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-[#e8e0f4]"
        />
    );
}
